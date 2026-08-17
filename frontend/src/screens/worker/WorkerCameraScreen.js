import React from "react";
import FaceCheckInFlow from "../../components/FaceCheckInFlow";

export default function WorkerCameraScreen({ navigation }) {
  return <FaceCheckInFlow navigation={navigation} showSearchBar={false} />;
}
