# Previsão do Tempo — Curitiba / Itajaí / Esteio

Gerador do Apps Script vinculado a uma apresentação **própria** de clima
(1 slide por cidade). Projeto **separado** dos demais — cada obra tem seu
gerador, este é o único que cobre as três cidades numa única apresentação.

- Apresentação: `1isdNKs4liaXiDMtXX1Ket-mfwudznGL7EJaKTewWKos`
- Dados: API pública [Open-Meteo](https://open-meteo.com) (sem chave).

## Arquivo

| Arquivo | O que faz |
|---|---|
| `previsao-tempo.gs` | 1 slide por cidade (Curitiba/PR, Itajaí/SC, Esteio/RS) com condição atual (temperatura, descrição, umidade, vento, chuva) e previsão de hoje até domingo. |

## Como usar

Abrir a apresentação → menu **🌤️ Previsão do Tempo** → **🔄 Atualizar previsão**.

Os slides gerados são marcados via nota (`【CLIMA_AUTO】`) e substituídos a
cada atualização, preservando os demais slides da apresentação.
