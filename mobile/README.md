# Aplicativo mobile

Aplicativo React Native/Expo do ClassWatch.

## Configuração

Crie `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:8080
```

Em um celular físico, não use `localhost`: informe o IP do computador na mesma rede ou uma URL pública HTTPS.

## Execução

```bash
npm install
npx expo start
```

## Verificações

```bash
npm run typecheck
npm run lint
```
