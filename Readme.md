This is an example Thunderbird addon that tries to make the new attachment apis of Thunderbird 88 available on Thunderbird 78 by converting them to a web extension experiment. 

Thunderbird 88 `messages` api introduces two new functions related to attachments:

* `messages.listAttachments()` 
* `messages.getAttachmentFile()` 

This web extension experiment tries to backport [the original Thunderbird source patch 'D107403' by darktrojan](https://phabricator.services.mozilla.com/D107403) to make the new functionality available in Thunderbird 78.

It includes a simplified version of the sample extension [`messageDisplayScriptPdfPreview` by thundernest](https://github.com/thundernest/sample-extensions/tree/master/messageDisplayScriptPdfPreview) to demo the usage of the attachment apis.

## Credits & License

This example extension is based on work from:
 - thunderbird
 - darktrojan
 - e-gaulue
 - rholeczy
 - sttzr

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.


