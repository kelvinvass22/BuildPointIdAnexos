import React from "react";
import FaceCheckInFlow from "../../components/FaceCheckInFlow";

export default function ManagerCameraScreen({ navigation, route }) {
  const { obraId } = route?.params || {};
  return <FaceCheckInFlow navigation={navigation} mode="contingencia" obraId={obraId} />;
}
