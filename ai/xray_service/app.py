import os
import cv2
import math
import numpy as np
from flask import Flask, request, jsonify
from PIL import Image
import tensorflow as tf
from tensorflow import keras
from google import genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    client = genai.Client(api_key=api_key)
else:
    print("WARNING: GEMINI_API_KEY not found in environment variables.")
    client = None

# Note: model.h5 must be placed in the same directory as this file before running.
MODEL_PATH = 'model.h5'
LAST_CONV_LAYER_NAME = "conv5_block16_concat"  # Hardcoded for DenseNet121

# Load model at startup
if os.path.exists(MODEL_PATH):
    print(f"Loading model from {MODEL_PATH}...")
    model = keras.models.load_model(MODEL_PATH)
    print("Model loaded successfully.")
    
    # Check if the last conv layer exists in the model
    try:
        model.get_layer(LAST_CONV_LAYER_NAME)
    except ValueError:
        print(f"WARNING: The model architecture differs. Layer '{LAST_CONV_LAYER_NAME}' not found.")
else:
    print(f"WARNING: Model file {MODEL_PATH} not found. Please ensure it is placed in the same directory.")
    model = None

def get_gradcam_heatmap(model, img_array, last_conv_layer_name, pred_index=None):
    """
    Generate Grad-CAM heatmap for a given image array and model.
    """
    # Create a submodel that outputs the conv layer's output and the model's output
    grad_model = keras.models.Model(
        [model.inputs], 
        [model.get_layer(last_conv_layer_name).output, model.output]
    )

    with tf.GradientTape() as tape:
        last_conv_layer_output, preds = grad_model(img_array)
        if pred_index is None:
            pred_index = tf.argmax(preds[0])
        class_channel = preds[:, pred_index]

    # Gradient of the top predicted class with respect to the conv output
    grads = tape.gradient(class_channel, last_conv_layer_output)

    # Pool gradients and weight them
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    last_conv_layer_output = last_conv_layer_output[0]
    
    # Weight the features by the pooled gradients
    heatmap = last_conv_layer_output @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)

    # Apply ReLU
    heatmap = tf.maximum(heatmap, 0) / tf.math.reduce_max(heatmap)
    return heatmap.numpy()

def extract_bboxes(heatmap, orig_width, orig_height, confidence, threshold=0.5, min_area=100):
    """
    Extract bounding boxes from heatmap.
    """
    # Resize heatmap to original image dimensions
    heatmap_resized = cv2.resize(heatmap, (orig_width, orig_height))
    
    # Threshold to binary
    heatmap_binary = np.uint8(heatmap_resized > threshold) * 255
    
    # Find contours
    contours, _ = cv2.findContours(heatmap_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    bboxes = []
    for contour in contours:
        # Compute bounding rectangle
        x, y, w, h = cv2.boundingRect(contour)
        
        # Filter by min_area
        if w * h >= min_area:
            bboxes.append({
                "label": "anomaly",
                "confidence": float(confidence),
                "bbox": {
                    "x": (x / orig_width) * 100,
                    "y": (y / orig_height) * 100,
                    "width": (w / orig_width) * 100,
                    "height": (h / orig_height) * 100
                }
            })
            
    return bboxes

# Uncertainty thresholds
BLUR_VARIANCE_THRESHOLD = 100
HIGH_ENTROPY_THRESHOLD = 0.9
LOW_MARGIN_THRESHOLD = 0.1
MODERATE_ENTROPY_THRESHOLD = 0.7
MODERATE_MARGIN_THRESHOLD = 0.2

def assess_reliability(pred_prob, entropy, margin, blur_score, is_anomaly):
    if blur_score < BLUR_VARIANCE_THRESHOLD:
        return "low", "Low reliability - image is blurry, interpretation may be inaccurate."
    elif entropy > HIGH_ENTROPY_THRESHOLD or margin < LOW_MARGIN_THRESHOLD:
        return "low", "Low reliability - model is highly uncertain, please review carefully."
    elif entropy > MODERATE_ENTROPY_THRESHOLD or margin < MODERATE_MARGIN_THRESHOLD:
        return "moderate", "Moderate reliability - findings should be confirmed with clinical judgment."
    else:
        return "high", "High reliability - model is confident in this assessment."

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "X-Ray Analysis Service is running", "endpoints": ["POST /predict"]})

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded on server. Ensure model.h5 is in the same directory as app.py"}), 500
        
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided. Make sure to use form-data with key 'image'."}), 400
        
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({"error": "No image file selected."}), 400
        
    try:
        # Open image using PIL, convert to RGB
        img = Image.open(file.stream).convert('RGB')
        orig_width, orig_height = img.size
        
        # Resize to 224x224 and normalise
        img_resized = img.resize((224, 224))
        img_array = np.array(img_resized) / 255.0
        
        # Expand dims to (1, 224, 224, 3)
        img_array = np.expand_dims(img_array, axis=0)
        
        # Run prediction
        preds = model.predict(img_array)
        
        # Determine pneumonia probability depending on output shape
        if preds.shape[-1] == 1:
            pneumonia_prob = preds[0][0]
            pred_index = 0
        else:
            pneumonia_prob = preds[0][1] # assuming index 1 is pneumonia
            pred_index = 1
            
        if pneumonia_prob < 0.5:
            return jsonify({"anomalies": []})
            
        # Otherwise, compute heatmap using Grad-CAM
        heatmap = get_gradcam_heatmap(model, img_array, LAST_CONV_LAYER_NAME, pred_index=pred_index)
        
        # Extract bounding boxes from heatmap
        anomalies = extract_bboxes(heatmap, orig_width, orig_height, confidence=pneumonia_prob)
        
        return jsonify({"anomalies": anomalies})
        
    except Exception as e:
        print(f"Error processing request: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/explain', methods=['POST'])
def explain():
    if model is None:
        return jsonify({"error": "Model not loaded on server."}), 500
        
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided."}), 400
        
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({"error": "No image file selected."}), 400
        
    try:
        # 1. Run the same prediction logic
        img = Image.open(file.stream).convert('RGB')
        orig_width, orig_height = img.size
        
        # Compute sharpness variance before resizing
        img_np = np.array(img)
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        is_blurry = blur_score < BLUR_VARIANCE_THRESHOLD
        
        img_resized = img.resize((224, 224))
        img_array = np.array(img_resized) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        
        preds = model.predict(img_array)
        
        if preds.shape[-1] == 1:
            pneumonia_prob = float(preds[0][0])
            pred_index = 0
        else:
            pneumonia_prob = float(preds[0][1])
            pred_index = 1
            
        # Compute entropy and margin
        p = pneumonia_prob
        epsilon = 1e-7
        entropy = -p * math.log2(p + epsilon) - (1 - p) * math.log2(1 - p + epsilon)
        margin = abs(p - 0.5)
        is_anomaly = p >= 0.5
        
        rel_level, rel_message = assess_reliability(p, entropy, margin, blur_score, is_anomaly)
        
        uncertainty = {
            "entropy": float(entropy),
            "margin": float(margin),
            "sharpness_variance": float(blur_score),
            "is_blurry": bool(is_blurry),
            "reliability_level": rel_level,
            "message": rel_message
        }
            
        if pneumonia_prob < 0.5:
            anomalies = []
            explanation = "No significant anomalies detected. The radiograph appears normal."
        else:
            heatmap = get_gradcam_heatmap(model, img_array, LAST_CONV_LAYER_NAME, pred_index=pred_index)
            anomalies = extract_bboxes(heatmap, orig_width, orig_height, confidence=pneumonia_prob)
            
            # 2. Generate Explainable Report with Gemini
            structured_findings = f"Pneumonia (confidence: {pneumonia_prob:.2f})"
            if anomalies:
                # Add bounding box info to prompt to give the LLM context of where it is
                box = anomalies[0]['bbox']
                structured_findings += f" located approximately at region (x={box['x']:.1f}%, y={box['y']:.1f}%, w={box['width']:.1f}%, h={box['height']:.1f}%)."
            
            prompt = f"""You are an expert radiologist. Based on the following AI findings, write a concise, professional radiology report impression (2-3 sentences). Mention the confidence level. Do not make up findings. Do NOT use any markdown formatting like asterisks or bold text, use plain text only.

AI Findings: {structured_findings}"""

            try:
                if not client:
                    raise Exception("Gemini API client not initialized. Check GEMINI_API_KEY.")
                response = client.models.generate_content(
                    model='gemini-3.1-flash-lite',
                    contents=prompt
                )
                explanation = response.text.strip()
            except Exception as e:
                print(f"Error generating explanation: {e}")
                explanation = "AI explanation generation failed."

        return jsonify({
            "anomalies": anomalies,
            "explanation": explanation,
            "uncertainty": uncertainty
        })
        
    except Exception as e:
        print(f"Error processing explain request: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
