import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Camera as ExpoCamera } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

const GOOGLE_CLOUD_VISION_API_KEY = 'YOUR_GOOGLE_CLOUD_VISION_API_KEY';

export default function ScanningScreen() {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [text, setText] = useState('');
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await ExpoCamera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  const handleCaptureAndReadText = async () => {
    if (cameraRef.current) {
      console.log("Camera ref is ready:", cameraRef.current);
      setIsProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync();
        const resizedImage = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 800 } }],
          { base64: true }
        );
        const response = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [
                {
                  image: { content: resizedImage.base64 },
                  features: [{ type: 'TEXT_DETECTION' }],
                },
              ],
            }),
          }
        );
        const result = await response.json();
        const detectedText = result.responses[0]?.fullTextAnnotation?.text || 'No text detected';
        setText(detectedText);
        Alert.alert('Detected Text', detectedText);
      } catch (error) {
        console.error("Error in capture or processing:", error);
      } finally {
        setIsProcessing(false);
      }
    } else {
      console.log("Camera not ready");
    }
  };

  if (hasCameraPermission === null) {
    return <View><Text>Requesting camera permissions...</Text></View>;
  }
  if (hasCameraPermission === false) {
    return <View><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      {hasCameraPermission && (
        <ExpoCamera
          style={styles.camera}
          ref={cameraRef}
          onCameraReady={() => console.log("Camera is ready")}
        />
      )}
      <Button title="Capture & Read Text" onPress={handleCaptureAndReadText} />
      {isProcessing && <ActivityIndicator size="large" color="#0000ff" />}
      {text ? (
        <View style={styles.textContainer}>
          <Text style={styles.detectedText}>{text}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  textContainer: {
    position: 'absolute',
    bottom: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  detectedText: { color: 'white' },
});
