# Ascensão do Cavaleiro (protótipo)

Jogo de sobrevivência com hordas para o navegador, no estilo "survivors". O herói ataca sozinho e você só controla o movimento. Feito com **Phaser 3 + TypeScript + Vite**.

## Como rodar

```bash
cd jogo-cavaleiro
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # gera a pasta dist/ pronta para publicar (itch.io, GitHub Pages...)
```

## Controles
- **WASD / setas**: andar (no celular, toque e arraste)
- **1 / 2 / 3 ou clique**: escolher a melhoria ao subir de nível
- **P / ESC**: pausar
- **L**: sobe um nível na hora (só no `npm run dev`, para testes)

## Classes

Todos começam como **Aprendiz** (sprite desenhado à mão, em `src/assets/aprendiz.png`). No **nível 5** o jogador escolhe a profissão, e as promoções seguintes acontecem nos níveis 10 e 20.

| Profissão (Nv 5) | Nível 10 | Nível 20 |
|---|---|---|
| Espadachim: Golpe de Espada +1 | Guarda: Escudo Giratório | Cavaleiro: Investida de Lança |
| Iniciado Arcano: Bola de Fogo | Mago: Corrente de Raios | Arquimago: Chuva de Meteoros |
| Arqueiro: Flecha | Caçador: Chuva de Flechas | Patrulheiro: Tiro Certeiro |

Cada habilidade vai até o nível 5. Também existem 8 melhorias passivas (Força, Agilidade, Alcance, Vitalidade, Regeneração, Botas, Ímã, Armadura).

## Sprites desenhados à mão
Ficam em `src/assets/` e são registrados em `src/sprites.ts`. Formato: PNG com fundo transparente, quadros de 128x128 lado a lado, personagem virado para a direita e pés na altura 122. Os quadros com nome (`idle0`, `walk0`, `atk0`, `die0`...) viram as animações `parado`, `andar`, `ataque` e `morte`.

## Inimigos e chefes
Gosma, Morcego, Cogumelo Andante, Esqueleto, Fantasma, Orc e Cavaleiro Negro (elite) aparecem conforme o tempo passa. A cada minuto vem uma horda. A cada 5 minutos aparece um chefe (Rei Gosma, depois Lorde Esqueleto, e assim por diante), com barra de vida no topo da tela.

## Estrutura

```
src/
  data/        ← balanceamento: classes, habilidades, inimigos, melhorias, atributos
  skills/      ← lógica de cada habilidade (Espada, Escudo, Lança)
  objects/     ← Enemy e Pickup (reutilizados com object pooling)
  scenes/      ← Game (jogo), UI (HUD), LevelUp, Menu/GameOver
  art.ts       ← arte dos personagens, itens e cenário (desenhada por código)
  projectiles.ts ← flechas e bolas de fogo
  fx.ts        ← efeitos visuais reaproveitados
```

- **Nova classe ou linhagem**: adicione em `src/data/classes.ts`. Se ela tiver uma habilidade nova, crie a habilidade em `src/skills/` e registre em `src/skills/index.ts` e `src/data/skills.ts`.
- **Arte de verdade**: carregue as imagens no `BootScene` com as mesmas chaves (`hero-aprendiz`, `en-gosma`, `escudo`...) e remova o desenho correspondente em `textures.ts`.
