/* 
 * Based on https://phabricator.services.mozilla.com/D107403#change-sMuFDg6mIXwF
 */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
 var { MsgHdrToMimeMessage } = ChromeUtils.import("resource:///modules/gloda/MimeMessage.jsm");
 var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
 var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
 var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

 
 Cu.importGlobalProperties(["fetch", "File"]);
 
 
 function convertAttachment(attachment) {
   return {
     contentType: attachment.contentType,
     name: attachment.name,
     size: attachment.size,
     partName: attachment.partName,
   };
 }
 
 
 // This is the important part. It implements the functions and events defined in schema.json.
 // The variable must have the same name you've been using so far, "myapi" in this case.
 var attachments_tb78 = class extends ExtensionCommon.ExtensionAPI {
   getAPI(context) {
     return {
       // Again, this key must have the same name.
       attachments_tb78: {
         async listAttachments(messageId) {
           // Get an nsIMsgDBHdr from a MessageHeader:
           let msgHdr = context.extension.messageManager.get(messageId);

           if (!msgHdr) {
             throw new ExtensionError(`Message not found: ${messageId}.`);
           }
 
           return new Promise(resolve => {
             MsgHdrToMimeMessage(
               msgHdr,
               null,
               (_msgHdr, mimeMsg) => {
                 resolve(mimeMsg.allAttachments.map(convertAttachment));
               },
               true,
               { examineEncryptedParts: true, partsOnDemand: true }
             );
           });
         },
         async getAttachmentFile(messageId, partName) {
           // Get an nsIMsgDBHdr from a MessageHeader:
           let msgHdr = context.extension.messageManager.get(messageId);           
           
           if (!msgHdr) {
             throw new ExtensionError(`Message not found: ${messageId}.`);
           }
 
           // It's not ideal to have to call MsgHdrToMimeMessage here but we
           // need the name of the attached file, plus this also gives us the
           // URI without having to jump through a lot of hoops.
           let attachment = await new Promise(resolve => {
             MsgHdrToMimeMessage(
               msgHdr,
               null,
               (_msgHdr, mimeMsg) => {
                 resolve(
                   mimeMsg.allAttachments.find(a => a.partName == partName)
                 );
               },
               true,
               { examineEncryptedParts: true, partsOnDemand: true }
             );
           });
 
           if (!attachment) {
             throw new ExtensionError(
               `Part ${partName} not found in message ${messageId}.`
             );
           }
           let aSecurityFlags =
             Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL || // for TB Beta 80 and newer
             Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL; // for TB 78
             // see https://developer.thunderbird.net/add-ons/updating/tb91/changes#nsiloadinfo-sec_allow_cross_origin_data_is_null
             
           let channel = Services.io.newChannelFromURI(
             Services.io.newURI(attachment.url),
             null,
             Services.scriptSecurityManager.getSystemPrincipal(),
             null,
             
             aSecurityFlags,
             Ci.nsIContentPolicy.TYPE_OTHER
           );
 
           let byteArray = await new Promise(resolve => {
             let listener = Cc[
               "@mozilla.org/network/stream-loader;1"
             ].createInstance(Ci.nsIStreamLoader);
             listener.init({
               onStreamComplete(loader, context, status, resultLength, result) {
                 resolve(Uint8Array.from(result));
               },
             });
             channel.asyncOpen(listener, null);
           });
 
           return new File([byteArray], attachment.name);
         },
         async openAttachment(messageId, partName) {
           // Get an nsIMsgDBHdr from a MessageHeader:
           let msgHdr = context.extension.messageManager.get(messageId);           
           
           if (!msgHdr) {
             throw new ExtensionError(`Message not found: ${messageId}.`);
           }
 
           // It's not ideal to have to call MsgHdrToMimeMessage here but we
           // need the name of the attached file, plus this also gives us the
           // URI without having to jump through a lot of hoops.
           let attachment = await new Promise(resolve => {
             MsgHdrToMimeMessage(
               msgHdr,
               null,
               (_msgHdr, mimeMsg) => {
                 resolve(
                   mimeMsg.allAttachments.find(a => a.partName == partName)
                 );
               },
               true,
               { examineEncryptedParts: true, partsOnDemand: true }
             );
           });
 
           if (!attachment) {
             throw new ExtensionError(
               `Part ${partName} not found in message ${messageId}.`
             );
           }
           console.log("attachment", attachment);
           console.log("msgHdr", msgHdr);
           /*
           // Not needed:
           let mimeMsg = await new Promise(resolve => {
            MsgHdrToMimeMessage(
              msgHdr,
              null,
              (_msgHdr, mimeMsg) => {
                resolve(
                  mimeMsg
                );
              },
              true,
              { examineEncryptedParts: true, partsOnDemand: true }
            );
            
          });
          console.log("mimeMsg", mimeMsg);
          */
          let messageURI = msgHdr.folder.getUriForMsg(msgHdr); // found this on https://searchfox.org/comm-central/source/mail/extensions/openpgp/content/modules/stdlib/msgHdrUtils.jsm#74
          console.log("messageURI", messageURI);

          let messenger = Cc["@mozilla.org/messenger;1"].createInstance(
            Ci.nsIMessenger
          );
          console.log("messenger", messenger);

          const encodedFilename = encodeURIComponent(attachment.name);
          console.log("encodedFilename", encodedFilename);

           try {
            messenger.openAttachment(
              attachment.contentType,
              attachment.url,
              encodedFilename,
              messageURI,
              attachment.isExternal
            );
            console.log("yeah! did the attachment open?");
           } catch (error) {
             console.log("ooh", error);
           }
           
         }
       },
     };
   }
 
   onShutdown(isAppShutdown) {
     // This function is called if the extension is disabled or removed, or Thunderbird closes.
     // We usually do not have to do any cleanup, if Thunderbird is shutting down entirely
     if (isAppShutdown) {
       return;
     }
     console.log("Goodbye world!");
 
     // Thunderbird might still cache some of your JavaScript files and even if JSMs have been unloaded,
     // the last used version could be reused on next load, ignoring any changes. Get around this issue
     // by invalidating the caches (this is identical to restarting TB with the -purgecaches parameter):
     Services.obs.notifyObservers(null, "startupcache-invalidate", null);    
   }
 };