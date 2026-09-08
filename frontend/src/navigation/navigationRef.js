import { createNavigationContainerRef, CommonActions } from "@react-navigation/native";

/**
 * Ref global de navegação, pra permitir navegar de FORA de um componente
 * de tela -- usado hoje só por `services/api.ts`: quando o refresh do
 * token falha (sessão expirada/revogada) no meio de qualquer chamada, o
 * interceptor precisa mandar o app de volta pra tela de Login, mas ele
 * não tem acesso a um `navigation` de tela nenhuma.
 */
export const navigationRef = createNavigationContainerRef();

export function resetToAuth() {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: "Auth", params: { screen: "ProfileSelect" } }],
    })
  );
}

export default { navigationRef, resetToAuth };
