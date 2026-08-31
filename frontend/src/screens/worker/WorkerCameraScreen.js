import React from "react";
import FaceCheckInFlow from "../../components/FaceCheckInFlow";

export default function WorkerCameraScreen({ navigation, route }) {
  const { obraId } = route?.params || {};
  return <FaceCheckInFlow navigation={navigation} mode="checkin" obraId={obraId} />;
}
