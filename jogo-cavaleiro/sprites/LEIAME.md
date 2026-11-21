# Sprites

Folhas de sprites em PNG (fonte para edição). O jogo usa as cópias em WebP de `src/assets/`, que são cerca de 60% menores.

- Quadros de 160x128 (o Aprendiz usa 128x128), lado a lado, na ordem listada em `src/sprites.ts`.
- Personagem virado para a direita, com os pés na linha 122 de cada quadro.

Para atualizar um personagem: edite o PNG aqui e gere o WebP sem perda, por exemplo:

```bash
python3 -c "from PIL import Image; Image.open('sprites/paladino.png').save('src/assets/paladino.webp', lossless=True, method=6)"
```
