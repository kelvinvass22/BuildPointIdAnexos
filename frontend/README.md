# BuildPoint ID — App Expo

App React Native (Expo) com fidelidade aos 4 protótipos: seleção de perfil/login, fluxo do Operário, fluxo do Gerente e fluxo do Dono/Construtora.

## Como rodar

```bash
npm install
npx expo start
```

Escaneie o QR Code com o app **Expo Go** (Android/iOS).

## Estrutura

```
App.js                          # NavigationContainer + RootStack (Auth / Worker / Manager / Owner)
src/
  theme/theme.js                # Cores, radius, spacing (design system)
  data/mockData.js               # Dados fictícios (histórico, obras, presença...)
  components/
    FaceCheckInFlow.js          # Fluxo de câmera facial reutilizado (Operário e Gerente)
  screens/
    SettingsScreen.js           # Tela de configurações (tab "engrenagem")
    auth/
      ProfileSelectScreen.js    # Seleção de perfil (Dono / Gerente / Operário)
      LoginScreen.js             # CPF/CNPJ + Senha
    worker/
      WorkerHomeScreen.js        # Relógio + botão "Bater Ponto Agora"
      WorkerHistoryScreen.js     # Histórico mensal
      WorkerCameraScreen.js      # Wrapper do FaceCheckInFlow
    manager/
      ManagerDashboardScreen.js  # Obra atual, ações rápidas, presença diária
      RadiusConfigScreen.js      # Slider de raio do ponto
      RegisterWorkerScreen.js    # Cadastro de operário + ID facial
      ManagerCameraScreen.js     # Wrapper do FaceCheckInFlow (com busca)
    owner/
      OwnerDashboardScreen.js    # Visão geral de obras/gerentes/operários
      RegisterConstructionScreen.js # Cadastro de nova obra
  navigation/
    AuthStack.js
    WorkerStack.js
    ManagerStack.js / ManagerTabs.js
    OwnerStack.js / OwnerTabs.js
```

## Fluxo de navegação

1. `ProfileSelectScreen` → escolhe o perfil → `LoginScreen` (CPF/CNPJ + senha).
2. Ao logar, `navigation.reset` leva para a stack do perfil escolhido (Worker / Manager / Owner) — sem possibilidade de "voltar" ao login.
3. **Operário**: Home (bater ponto) ⇄ Histórico, ambos com barra inferior de 2 ícones. Botão grande abre a câmera facial (`expo-camera`) com overlay tracejado simulando a marcação de rosto.
4. **Gerente**: Bottom Tabs (Obras / Home elevado / Config). Da Home acessa Configurar Raio (slider), Cadastrar Operário e Registrar Ponto da Equipe (câmera com busca por nome/CPF).
5. **Dono**: Bottom Tabs (Obras / Home elevado / Config). Lista de obras com botão flutuante "+" para Cadastrar Nova Obra.

## Observações

- Todos os dados são mockados em `src/data/mockData.js` — não há chamadas de API/backend.
- A câmera usa `expo-camera` (`CameraView`) com fallback visual caso a permissão não seja concedida (útil ao testar no simulador/web).
- Cores extraídas dos protótipos estão centralizadas em `src/theme/theme.js` — para ajustar o tom de azul, edite `COLORS.primary`.
