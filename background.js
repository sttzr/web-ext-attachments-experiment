/**
 * This example extension is based on work from:
 *  - e-gaulue
 *  - rholeczy
 */

const PREVIEW_WIDTH = 160;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * 1.5;


/**
 * This function reads all attachments and extracts data image URLs for PDFs and
 * standard images and sends those to the requesting tab for display.
 *
 * The pdf.js library is used to render PDFs.
 *
 * @param {Integer} tabId - the id of the WebExtension message display Tab
 * @param {Integer} messageId - the id of the WebExtension MessageHeader
 */
async function addInlinePreviews(tabId, messageId) {
  // Get a list of all attachments.
  let attachments = await browser.attachments_tb78.listAttachments(messageId);
  let loadingSpinnerShown = false;

  for (let attachment of attachments) {
    // Only images are handled.
    if (!attachment.contentType.toLowerCase().startsWith("image/")) {
      continue;
    }

    // There is at least one inline preview. Send a message to the tab to
    // prepare the message body and to display a loading spinner. We do this
    // only once.
    if (!loadingSpinnerShown) {
      await browser.tabs.sendMessage(tabId, { command: "prepareMessageBody" });
      loadingSpinnerShown = true;
    }

    // Get the requested attachment.
    let file = await browser.attachments_tb78.getAttachmentFile(
      messageId,
      attachment.partName
    );

    // Get a data URL from the attachment.
    let reader = new FileReader();
    attachment.url = await new Promise(resolve => {
      reader.onload = e => {
        resolve(e.target.result);
      };
      reader.readAsDataURL(file);
    });

    // Handle image attachments.
    if (attachment.contentType.toLowerCase().startsWith("image/")) {
      // Send a message to the tab to display the preview.
      await browser.tabs.sendMessage(tabId, {
        command: "addImagePreview",
        width: PREVIEW_WIDTH,
        height: PREVIEW_HEIGHT,
        imageDataUrl: attachment.url,
        partName: attachment.partName,
        pageNumber: 0,
        messageId,
      });
    }
  }

  // Send a message to the tab to hide the loading spinner again (if shown).
  if (loadingSpinnerShown) {
    await browser.tabs.sendMessage(tabId, { command: "hideSpinner" });
    loadingSpinnerShown = false;
  }
}

browser.runtime.onMessage.addListener((data, sender) => {
  // Handle inline-preview requests.
  if (data.command == "addInlinePreviews") {
    let tabId = sender.tab.id;
    browser.messageDisplay.getDisplayedMessage(tabId).then(message => {
      addInlinePreviews(tabId, message.id);
    });
  }
});

browser.messageDisplayScripts.register({ js: [{ file: "initial.js" }] });
