# Prompts para gerar a arte

Cole no gerador de imagem (ChatGPT/DALL·E, Midjourney, Leonardo, etc.). Os prompts estão em inglês porque os geradores entendem melhor.
Sempre comece com o **estilo base** e depois cole o prompt específico. Se o gerador aceitar imagem de referência, anexe um quadro do `jogo-cavaleiro/sprites/cavaleiro.png` ou `aprendiz.png`.

## Estilo base (colar antes de todos)

```
High-resolution 2D game art in the style of classic Korean MMORPGs from the early 2000s: chibi proportions (big head, ~3 heads tall), soft painted pixel-art shading, clean dark-brown outline, warm muted fantasy palette, 3/4 top-down camera (about 45° from above), light coming from the top-left, no text, no watermark, no UI.
```

## 1. Tileset — Campos Verdes

```
[STYLE BASE] Seamless tileset sheet for a top-down 3/4 RPG map, grid of 64x64 px tiles on a transparent background: lush green grass (4 variations), dirt path with grass edges (straight, corners, T-junction), small flowers, pebbles, short cliff edge with brown rock face, wooden fence pieces, a small pond with water edges. Every tile must tile seamlessly with its neighbors. Orthographic, no perspective distortion.
```

## 2. Tileset — Ruínas Esquecidas

```
[STYLE BASE] Seamless tileset sheet, 64x64 px tiles, transparent background, for ancient forgotten ruins: cracked grey stone floor (4 variations), mossy stone floor, broken stone walls in 3/4 view (straight, corner, end), fallen columns, rubble, dead grass, purple-glowing runes on the floor, stairs going down. Spooky but colorful, seamless edges.
```

## 3. Tileset — Cidade inicial

```
[STYLE BASE] Seamless tileset sheet, 64x64 px tiles, transparent background, for a cozy medieval fantasy starting town: cobblestone plaza floor (4 variations), cobblestone with grass border, fountain (2x2 tiles), market stall, wooden barrels and crates, street lamp, flower pots, small stone bridge.
```

## 4. Objetos grandes do mapa (cada um separado)

```
[STYLE BASE] Single game prop on a transparent background, 3/4 top-down view: <OBJECT>. Centered, full object visible, soft shadow on the ground.
```
Troque `<OBJECT>` por: `a tall oak tree`, `a pine tree`, `a red-roofed cottage`, `a church with a bell tower`, `a blacksmith shop with an anvil`, `a magical blue portal swirling on a stone circle` (portal entre mapas), `a dark demonic altar with purple flames` (sala do Bafome).

## 5. Heróis em 4 direções (necessário para o RPG)

Os sprites atuais só olham para a direita. Para andar por clique é preciso pelo menos frente, costas e lado (o outro lado é espelhado).

```
[STYLE BASE] Character sprite sheet on a transparent background, same character in every frame: <CHARACTER>. Layout: 3 rows × 4 columns, each cell 160x128 px, feet aligned at the same baseline. Row 1: walking facing down (towards camera), 4 frames. Row 2: walking facing up (back to camera), 4 frames. Row 3: walking facing right (side view), 4 frames. Consistent size, colors and proportions across all frames.
```
Personagens (`<CHARACTER>`):
- Aprendiz: `young novice adventurer with messy silver hair, white scarf, brown tunic with beige apron, light steel greaves`
- Espadachim: `young swordsman with silver hair, light steel armor, short sword and round shield`
- Mago: `young mage with silver hair, dark blue hooded robe with gold trim, wooden staff with a glowing orb`
- Arqueiro: `young archer with silver hair, green hooded cloak, leather armor, wooden bow and quiver`

Repita o mesmo prompt trocando a ação por `attacking` e `idle breathing` quando precisar.

## 6. NPCs da cidade

```
[STYLE BASE] Single NPC sprite on a transparent background, facing down towards the camera, 160x128 px: <NPC>.
```
- `friendly merchant with a big backpack and a mustache`
- `stern job-change instructor wearing a red uniform and a cape`
- `kind priestess in white robes holding a staff` (cura)
- `bald blacksmith with a leather apron and hammer` (refino)

## 7. Ícones de interface

```
[STYLE BASE] Grid of 8 RPG item icons, each 48x48 px, transparent background, thick outline, readable at small size: red potion, orange potion, white potion, butterfly wing, short sword, wooden shield, leather armor, monster card.
```

## Dicas
- Peça **fundo transparente**; se vier com fundo branco, me mande assim mesmo que eu recorto.
- Se o gerador errar o tamanho dos quadros, não tem problema: eu reorganizo a folha.
- Mande os arquivos em `jogo-rpg/arte/` (ou anexe aqui) com o nome do que é, por exemplo `tiles-campos.png`.
