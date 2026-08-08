export function getCommonPrintStyles() {
  return `
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700&display=swap" />
    <style>
      body {
        font-family: 'Noto Serif Bengali', Arial, sans-serif;
        line-height: 1.6;
        margin: 20px;
      }
      h1 {
        text-align: center;
        margin-bottom: 20px;
      }
      .exam-info {
        margin-bottom: 30px;
        border: 1px solid #ddd;
        padding: 15px;
        border-radius: 5px;
      }
      .questions-container {
        column-count: 2;
        column-gap: 20px;
      }
      .question {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 25px;
      }
      .options {
        margin-left: 20px;
      }
      .option {
        margin: 5px 0;
      }
      .option-marker {
        display: inline-block;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 1px solid #666;
        text-align: center;
        line-height: 18px;
        font-size: 12px;
        margin-right: 8px;
      }
      .correct {
        font-weight: bold;
        color: green;
      }
      .watermark {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.1;
        transform: rotate(-45deg);
        font-size: 60px;
        color: #000;
        pointer-events: none;
      }
      @media print {
        .no-print {
          display: none;
        }
      }
    </style>
  `
}

export function getMathJaxConfig() {
  return `
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <script>
      window.MathJax = {
        tex: {
          inlineMath: [['$', '$'], ['\\\$$', '\\\$$']],
          displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
          processEscapes: true,
          processEnvironments: true
        },
        options: {
          ignoreHtmlClass: 'tex2jax_ignore',
          processHtmlClass: 'tex2jax_process'
        }
      };
    </script>
  `
}

export function addWatermark() {
  return `
    <div class="watermark">
      <div>
        <img src="/logo.png" alt="এডমিশন নিয়ে খেলছি" width="40" height="40" />
        <span>এডমিশন নিয়ে খেলছি (পিডিএফ শেয়ার করা বেআইনি কাজ)</span>
      </div>
    </div>
  `
}
