# BuildPoint ID — App (React Native + Expo)

App móvel único, com telas específicas por papel (Dono / Gerente / Operário), reconhecimento facial real rodando no aparelho e suporte a marcação de ponto **offline**.

> Reescrita completa deste README: a versão anterior descrevia um protótipo com dados mockados, sem backend e rodando no Expo Go. Nada disso é mais verdade — o app fala com uma API Django real, tem reconhecimento facial de verdade (não mais landmarks geométricos) e precisa de um Development Build.

## Por que não dá para usar o Expo Go

O app depende de módulos nativos que o Expo Go não inclui: `react-native-fast-tflite` (reconhecimento facial), `expo-secure-store` (cache de biometria offline), `expo-application` (identificador do dispositivo) e `expo-sharing` (compartilhar o recibo em PDF). Por isso o app precisa de um **Development Build** (ou um build `preview`/`production` para rodar de forma standalone, sem depender do Metro).

## Como rodar

```bash
npm install

# Gerar/instalar o Development Build (1ª vez, e sempre que um módulo nativo mudar)
eas build --profile development --platform android

# Rodar com o build já instalado no aparelho
npx expo start --dev-client
```

Para um APK **standalone** (não depende do notebook rodando o Metro — útil para demonstração/apresentação):

```bash
eas build --profile preview --platform android
```

### Variáveis de ambiente

| Variável | Obrigatória | Padrão | Uso |
| :--- | :---: | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | Não | `https://buildpointid.onrender.com` | URL do backend. Sobrescreva para apontar para um backend local ou para a futura VPS. |

## Estrutura

```
App.js                             # NavigationContainer + bootstrap de sessão + ErrorBoundary
src/
  theme/theme.js                   # Cores, radius, spacing (design system)
  data/tiposGerente.js             # Catálogo fixo de especialidades de gerente (espelha TipoGerente do backend)
  components/
    FaceCheckInFlow.js             # Fluxo de câmera facial unificado (check-in, cadastro de biometria e contingência)
    ChoiceModal.js                 # Seletor de opção única em modal (especialidade/tipo de gerente)
    ErrorBoundary.js               # Captura erros de renderização e evita tela branca
  services/
    api.ts                        # Instância axios + interceptor de refresh de token + reset de sessão
    authService.ts                 # Login, logout, sessão persistida (AsyncStorage)
    deviceService.js               # Identificador do dispositivo (Android ID / iOS vendor ID) e SO
    faceVectorService.js           # Extração do embedding facial (MobileFaceNet/TFLite) a partir da foto
    secureBiometryStore.js         # Cache local cifrado (SecureStore) do embedding autorizado, para uso offline
    offlineFaceValidationService.js # Comparação por similaridade de cosseno contra o cache local
    offlinePunchService.js         # Fila de marcações pendentes de sincronização
    clockService.js                # Sincronização do relógio exibido com o horário do servidor
    geoService.js                  # Geolocalização (GPS)
    workerService.js                # Ponto, histórico (agrupado por dia), recibo em PDF
    managerService.js               # Cadastro/edição de operário, biometria, contingência, equipes
    ownerService.js                 # Obras (criar/editar/apagar), vínculo de gerente
  navigation/
    navigationRef.js                # Referência global de navegação (permite reset de sessão fora de um componente)
    AuthStack.js
    WorkerStack.js
    ManagerStack.js / ManagerTabs.js
    OwnerStack.js / OwnerTabs.js
  screens/
    SettingsScreen.js
    auth/
      ProfileSelectScreen.js        # Seleção de perfil (Dono / Gerente / Operário)
      LoginScreen.js                 # CPF/CNPJ + Senha
    worker/
      WorkerHomeScreen.js            # Relógio + botão "Registrar Ponto"
      WorkerHistoryScreen.js         # Histórico agrupado por dia + download de recibo em PDF
      WorkerCameraScreen.js          # Wrapper do FaceCheckInFlow (modo checkin)
    manager/
      ManagerDashboardScreen.js      # Obra atual, ações rápidas, presença diária (com aviso de biometria pendente)
      RadiusConfigScreen.js          # Slider de raio do ponto (5–300 m)
      RegisterWorkerScreen.js        # Cadastro de operário (dados)
      EditWorkerScreen.js            # Edição de operário já cadastrado
      EnrollBiometryScreen.js        # Wrapper do FaceCheckInFlow (modo enroll)
      ManagerCameraScreen.js         # Wrapper do FaceCheckInFlow (modo contingência, com busca)
      TeamsScreen.js                 # Organização de equipes dentro da obra
    owner/
      OwnerDashboardScreen.js        # Visão geral de obras/gerentes/operários
      RegisterConstructionScreen.js  # Cadastro de nova obra
      ObraDetailScreen.js            # Edição/exclusão de obra + vínculo de gerente
assets/
  models/mobilefacenet.tflite        # Modelo de reconhecimento facial (ver assets/models/README.md e NOTICE.md — licença BSD-3-Clause)
  icon.png / adaptive-icon.png       # Ícone do aplicativo
```

## Fluxo de navegação

1. Ao abrir o app, uma sessão válida salva localmente pula direto para a Home do papel do usuário — sem pedir login de novo. Sem sessão válida, cai em `ProfileSelectScreen` → escolhe o perfil → `LoginScreen`.
2. Ao logar, `navigation.reset` leva para a stack do perfil retornado pelo backend (não pelo botão escolhido antes do login).
3. **Operário**: Home (registrar ponto) ⇄ Histórico (agrupado por dia, com recibo em PDF por marcação). O botão de câmera funciona **mesmo sem internet** — a identidade é validada localmente contra o embedding cacheado.
4. **Gerente**: Bottom Tabs. Da Home acessa Configurar Raio, Cadastrar/Editar Operário (com aviso quando a biometria está pendente), Registrar Ponto da Equipe (contingência com busca) e Organizar Equipes.
5. **Dono**: Bottom Tabs. Lista de obras com botão "+" para cadastrar; cada obra pode ser editada ou apagada (bloqueado pelo backend se já houver marcações registradas nela).

## Reconhecimento facial e funcionamento offline

- O rosto **nunca sai do aparelho**: `faceVectorService.js` extrai um embedding de 192 dimensões com o modelo MobileFaceNet via TFLite; só esse vetor é enviado ao backend.
- Depois do login (e periodicamente com internet disponível), o app baixa o próprio embedding autorizado do Operário e guarda cifrado no aparelho (`secureBiometryStore.js`).
- Sem internet, o app compara o rosto capturado com esse cache **antes** de decidir se enfileira a marcação — uma pessoa não cadastrada é recusada na hora, não fica pendente até sincronizar. Ao reconectar, o backend revalida tudo de novo (é ele quem decide de verdade e grava a auditoria).

## Observações

- `src/theme/theme.js` centraliza cores/espaçamento do design system — para ajustar o azul principal, edite `COLORS.primary`.
- `src/data/mockData.js` é resquício do protótipo inicial e não é mais usado pelas telas atuais (mantido só por não quebrar nenhum import residual — pode ser removido com segurança se nada mais o referenciar).
