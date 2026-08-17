import React from "react";
import FaceCheckInFlow from "../../components/FaceCheckInFlow";

export default function ManagerCameraScreen({ navigation }) {
  return <FaceCheckInFlow navigation={navigation} showSearchBar={true} />;
}
