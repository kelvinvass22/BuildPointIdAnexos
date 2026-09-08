# Atribuição — `mobilefacenet.tflite`

Este arquivo binário (`frontend/assets/models/mobilefacenet.tflite`) vem do
repositório [MCarlomagno/FaceRecognitionAuth](https://github.com/MCarlomagno/FaceRecognitionAuth),
sob a licença BSD 3-Clause:

```
Copyright (c) 2020, Marcos Carlomagno
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
```

A licença permite uso comercial e redistribuição (inclusive em forma
binária, como é o caso aqui), desde que este aviso de copyright seja
mantido — é o que este arquivo faz. Não é permitido usar o nome do autor
pra promover o BuildPoint ID sem autorização dele.

**Especificações confirmadas do modelo** (inspecionando o arquivo, não só a
documentação do repositório de origem):
- Entrada: tensor `input`, formato `[1, 112, 112, 3]`, `float32`.
- Saída: tensor `embeddings`, formato `[1, 192]`, `float32`.
- Normalização usada na implementação de referência: `(pixel - 128) / 128`.
- Comparação de referência: distância euclidiana sobre o embedding bruto
  (sem L2-normalizar), limiar `<= 0.5`. Este projeto L2-normaliza o
  embedding antes de comparar por similaridade de cosseno — ver
  `core/settings.py:FACE_LIMIAR_CONFIANCA` pra conversão e calibração.
