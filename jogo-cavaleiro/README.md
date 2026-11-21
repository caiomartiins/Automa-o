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

Todos começam como **Aprendiz**. No **nível 5** escolhem a 1ª classe e no **nível 15** escolhem entre dois caminhos de 2ª classe.

| 1ª classe (Nv 5) | 2ª classe (Nv 15): opção A | 2ª classe (Nv 15): opção B |
|---|---|---|
| Espadachim: Escudo Giratório | Cavaleiro: Golpe Devastador | Paladino: Aura Sagrada |
| Mago: Bola de Fogo | Bruxo: Corrente de Raios | Professor: Livros Voadores |
| Arqueiro: Flecha | Caçador: Chuva de Flechas | Patrulheiro: Tiro Certeiro |

O Golpe de Espada do Aprendiz continua com todos. Cada habilidade vai até o nível 5. Também existem 8 melhorias passivas (Força, Agilidade, Alcance, Vitalidade, Regeneração, Botas, Ímã, Armadura).

## Sprites desenhados à mão
Aprendiz, Espadachim, Mago, Cavaleiro, Paladino, Bruxo e Professor usam sprites recortados das imagens enviadas. A fonte em PNG fica em `sprites/` e o jogo usa as versões WebP de `src/assets/`, registradas em `src/sprites.ts`. Os arqueiros e os monstros ainda usam a arte gerada em `src/art.ts`.

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
