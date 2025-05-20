import * as vscode from 'vscode';

const fs = require('fs');

export class PreviewSidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "mmbn-dialog-previewer.openview";

  constructor(private readonly _extensionUri: vscode.Uri) {}

  // @ts-ignore
  private webviewView: vscode.WebviewView;

  resolveWebviewView(
    webviewView: vscode.WebviewView,
  ): void | Thenable<void> {
    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    // default webview
    this.webviewView = webviewView;
    this.setPreview(['']);

    // Listen for messages from the webview, to update the configuration
    // when the user changes the settings in the webview.
    webviewView.webview.onDidReceiveMessage(async message => {
      if (message.type === 'updateConfig') {
        await vscode.workspace.getConfiguration('mmbnDialogPreviewer').update(message.key, message.value, vscode.ConfigurationTarget.Global);
      }
    });
  }

  // Setting text preview, according to the received values.
  public setPreview(textBlocks: any) {
    const config = vscode.workspace.getConfiguration('mmbnDialogPreviewer');
    const previewType = config.get('previewType');
    const zoom = config.get('zoom');

    const webview = this.webviewView.webview;
    const stylesheetUris = {
      'main': webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, "assets", "main.css")
      ),
      'fonts': webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, "assets", "fonts.css")
      ),
    };
    const htmlUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "index.html")
    );

    let htmlContent = fs.readFileSync(htmlUri.fsPath, 'utf8');

    let previewMarkup = '';
    textBlocks.forEach((text: string) => {
      previewMarkup += `<span class="block"><span class="letters">`;

      for (let i = 0; i < text.length; i++) {
        let char = text.charAt(i);

        if (char == '\\') {
          char = '"';
        }
  
        if (char == '\n') {
          previewMarkup += '<br />';
        } else {
          previewMarkup += `<span class="letter ${this.formatChar(char)}">&nbsp;</span>`;
        }
      }

      previewMarkup += '</span></span>';
    });

    htmlContent = htmlContent.replace('${stylesheetUris.main}', stylesheetUris.main);
    htmlContent = htmlContent.replace('${stylesheetUris.fonts}', stylesheetUris.fonts);
    htmlContent = htmlContent.replace('${previewType}', previewType);
    htmlContent = htmlContent.replace('${zoom}', zoom);
    htmlContent = htmlContent.replace('${previewMarkup}', previewMarkup);

    this.webviewView.webview.html = htmlContent;
  }

  // Formatting character, to be shown in the preview
  private formatChar(char: string): string {
    let charTable: any = {
      // Symbols
      ' ': 'space', '!': 'exclamation', '"': 'double-quotes', '#': 'hashtag',
      '$': 'money-sign', '%': 'percent', '&': 'ampersand', "'": 'quotes',
      "(": 'open-parenthesis', ")": 'close-parenthesis', '*': 'asterisk',
      '+': 'plus', ',': 'comma', '-': 'minus', '.': 'dot', '/': 'slash',
      ':': 'colon', ';': 'semicolon', '<': 'less-than', '=': 'equal', '>': 'greater-than',
      '?': 'interrogation', '@': 'at-sign',
      '©': 'copyright', '[': 'open-square-brackets', ']': 'close-square-brackets',
      '_': 'underscore', '¡': 'inverted-exclamation',
      '¿': 'inverted-interrogation', 'º': 'o-ordinal', 'ª': 'a-ordinal', '…': 'reticences',
      'α': 'alpha', 'β': 'beta', 'Σ': 'sigma', 'Ω': 'omega',
      
      // Numbers
      '0': 'n0', '1': 'n1', '2': 'n2', '3': 'n3', '4': 'n4', '5': 'n5',
      '6': 'n6', '7': 'n7', '8': 'n8', '9': 'n9',
      
      // Uppercase accents
      'À': 'A-grave', 'Á': 'A-acute', 'Â': 'A-circumflex', 'Ã': 'A-tilde',
      'Ä': 'A-diaeresis', 'Ç': 'C-cedilla', 'È': 'E-grave', 'É': 'E-acute', 
      'Ê': 'E-circumflex', 'Ë': 'E-diaeresis', 'Ẽ': 'E-tilde', 'Ì': 'I-grave',
      'Í': 'I-acute', 'Ï': 'I-diaeresis', 'Î': 'I-circumflex', 'Ò': 'O-grave',
      'Ó': 'O-acute', 'Ô': 'O-circumflex', 'Õ': 'O-tilde', 'Ö': 'O-diaeresis',
      'Ù': 'U-grave', 'Ú': 'U-acute', 'Û': 'U-circumflex', 'Ü': 'U-diaeresis',
      'Ñ': 'N-tilde', 'Ÿ': 'Y-diaeresis',
      
      // Lowercase accents
      'à': 'a-grave', 'á': 'a-acute', 'â': 'a-circumflex', 'ã': 'a-tilde',
      'ä': 'a-diaeresis', 'ç': 'c-cedilla', 'è': 'e-grave', 'é': 'e-acute', 
      'ê': 'e-circumflex', 'ẽ': 'e-tilde', 'ë': 'e-diaeresis', 'ì': 'i-grave',
      'í': 'i-acute', 'ï': 'i-diaeresis', 'î': 'i-circumflex', 'ò': 'o-grave',
      'ó': 'o-acute', 'ô': 'o-circumflex', 'õ': 'o-tilde', 'ö': 'o-diaeresis',
      'ù': 'u-grave', 'ú': 'u-acute', 'û': 'u-circumflex', 'ü': 'u-diaeresis',
      'ñ': 'n-tilde', 'ÿ': 'y-diaeresis'
    }
    
    let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");
    for(var i in alphabet){
      let letter = alphabet[i];
      
      charTable[letter] = letter;
    }
    
    let key, newChar;
    for (key in charTable) {
      if (key == char){
        var newValue = charTable[key];
        newChar = char.replace(key, newValue);
        break;
      }
    }
    if (typeof newChar == 'string'){
      return newChar;
    } else {
      return 'unknown';
    }
  }
}