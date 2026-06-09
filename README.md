# node-red-contrib-svg-charts

Um nó leve, poderoso e 100% livre de dependências externas para gerar belos gráficos SVG e Base64 diretamente no Node-RED.

Construído para resolver o problema comum de exportação de gráficos em sistemas industriais e de automação, o **SVG Charts** gera gráficos vetoriais nativos que podem ser exibidos em Dashboards, enviados por e-mail, ou anexados em relatórios PDF mantendo resolução infinita.

## Principais Recursos

* **Zero Dependências:** Toda a matemática e renderização vetorial é feita nativamente no código. Sem bibliotecas pesadas pesando no seu servidor.
* **Múltiplos Tipos de Gráficos:** Colunas, Barras Horizontais, Linhas, Área, Pizza e Rosca.
* **Multi-Séries em Linhas:** Suporte para plotar múltiplas curvas no mesmo gráfico comparativo.
* **Design Profissional:** Auto-escala inteligente, curvas de Bezier (suavização) e temas premium (Modo Escuro, Gradientes).
* **Saída Dupla:** Retorna tanto o XML do SVG (`msg.payload`) quanto a string Data URI Base64 (`msg.base64`).
* **Propriedades Dinâmicas:** Sobrescreva configurações em tempo de execução enviando `msg.title`, `msg.width` e `msg.height`.

## Instalação

Você pode instalar o nó diretamente pelo **Manage Palette** no Node-RED ou executar o seguinte comando no diretório do seu Node-RED (geralmente `~/.node-red`):

```bash
npm install node-red-contrib-svg-charts
Como Alimentar os Dados
O nó aceita dados via msg.payload nestes três formatos principais:

1. Array Simples (Rápido)
Ideal para plotar valores brutos rapidamente.

JSON


[10, 45, 30, 80, 25]
2. Array de Objetos (Avançado)
Permite personalizar rótulos (label) e cores (color) específicos para cada barra ou fatia.

JSON


[
  { "value": 150, "label": "Produção", "color": "#00d2ff" },
  { "value": 30, "label": "Perda", "color": "#ff0055" }
]
3. Multi-Série (Para gráficos de Linha/Área)
Permite plotar mais de uma linha no mesmo gráfico para comparações.

JSON


[
  {
    "series": "Máquina A",
    "color": "#ff0000",
    "data": [22, 24, 23, 26]
  },
  {
    "series": "Máquina B",
    "color": "#0000ff",
    "data": [20, 21, 25, 24]
  }
]
Casos de Uso e Integrações
Relatórios com PDFMake
O PDFMake suporta gráficos em formato SVG nativamente. Isso significa que o gráfico será impresso no PDF com nitidez vetorial perfeita e sem serrilhados.

Fluxo: Seu Dado ➜ SVG Chart ➜ Function ➜ PDFMake

Código na Function:

JavaScript


let docDefinition = {
    content: [
        { text: 'Dashboard Financeiro', fontSize: 20, bold: true },
        { 
            svg: msg.payload, // O SVG gerado pelo nó
            width: 500, 
            alignment: 'center', 
            margin: [0, 20, 0, 20] 
        }
    ]
};
msg.payload = docDefinition;
return msg;
Exibição no Node-RED Dashboard (ui_template)
Conecte a saída do nó SVG Chart a um nó ui_template e use o código HTML abaixo:

HTML


<div style="width: 100%; display: flex; justify-content: center;">
    <div ng-bind-html="msg.payload"></div>
</div>
Envio de Alertas por E-mail
Para clientes de e-mail que não suportam a tag <svg>, você pode utilizar a saída estática Base64 gerada automaticamente:

HTML


<h2>Relatório Diário</h2>
<p>Aqui está o resumo do desempenho:</p>
<img src="{{msg.base64}}" alt="Gráfico" width="600" />
Autor e Licença
Criado por Marco Antonio Souza Pinto.
Distribuído sob a licença MIT.