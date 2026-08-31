import * as Location from 'expo-location';

export class GeoError extends Error {}

export const geoService = {
  /**
   * Pede permissão de localização (se ainda não concedida) e retorna a
   * posição atual do dispositivo no formato que os endpoints de
   * marcação/geofence esperam: { latitude, longitude, precisao_gps_metros }.
   */
  async getCurrentPosition() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new GeoError('Permita o acesso à localização para continuar.');
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      // O backend recusa configurar_geofence se precisao_gps_metros > 10.
      precisao_gps_metros: position.coords.accuracy ?? 999,
    };
  },
};

export default geoService;
