/*
  Libraryclass to create whole Epubs from Storys which are ongoing
*/
"use strict";

var LibFileReader = new FileReader();

class Library {
    constructor() {
    }
    
    LibAddToLibrary(AddEpub, fileName, overwriteExisting, backgroundDownload){
        //activate readinglist
        if (document.getElementById("includeInReadingListCheckbox").checked != true) {
            document.getElementById("includeInReadingListCheckbox").click();
        }
        chrome.storage.local.get(null, async function(items) {
            let CurrentLibStoryURLKeys = await Library.GetAllLibStorageKeys("LibStoryURL");
            let LibidURL = -1;
            for (let i = 0; i < CurrentLibStoryURLKeys.length; i++) {
                if (items[CurrentLibStoryURLKeys[i]] == document.getElementById("startingUrlInput").value) {
                    LibidURL = CurrentLibStoryURLKeys[i].replace("LibStoryURL","");
                    continue;
                }
            }
            if (LibidURL == -1) {
                Library.LibHandelUpdate(-1, AddEpub, document.getElementById("startingUrlInput").value, fileName.replace(".epub", ""), LibidURL);
                return Download.save(AddEpub, fileName, overwriteExisting, backgroundDownload);
            }
            
            fileName = EpubPacker.addExtensionIfMissing(items["LibFilename" + LibidURL]);
            if (Download.isFileNameIllegalOnWindows(fileName)) {
                ErrorLog.showErrorMessage(chrome.i18n.getMessage("errorIllegalFileName",
                    [fileName, Download.illegalWindowsFileNameChars]
                ));
                return;
            }

            let PreviousEpub = await (await fetch(items["LibEpub" + LibidURL])).blob();
            JSZip.loadAsync(PreviousEpub).then(async function(PreviousEpubzip) {
                var PreviousEpubImageFolder = PreviousEpubzip.folder("OEBPS/Images");
                var PreviousEpubTextFolder = PreviousEpubzip.folder("OEBPS/Text");
                var ImagenumberPreviousEpub = 0;
                var TextnumberPreviousEpub = 0;
                PreviousEpubImageFolder.forEach(function (relativePath) {
                    if (parseInt(relativePath.substring(0, 4))>=ImagenumberPreviousEpub) {
                        ImagenumberPreviousEpub = parseInt(relativePath.substring(0, 4))+1; 
                    }
                });
                PreviousEpubTextFolder.forEach(function (relativePath) {
                    if (parseInt(relativePath.substring(0, 4))>=TextnumberPreviousEpub) {
                        TextnumberPreviousEpub = parseInt(relativePath.substring(0, 4))+1; 
                    }
                });
                JSZip.loadAsync(AddEpub).then(async function(AddEpubzip) {
                    var AddEpubImageFolder = AddEpubzip.folder("OEBPS/Images");
                    var AddEpubTextFolder = AddEpubzip.folder("OEBPS/Text");
                    var ImagenumberAddEpub = 1;
                    var TextnumberAddEpub = 0;
                    if (AddEpubTextFolder.file("0000_Information.xhtml") != null) {
                        TextnumberAddEpub++;
                    }
                    let AddEpubTextFile;
                    let AddEpubImageFile;
                    let PreviousEpubContentText = await PreviousEpubzip.file("OEBPS/content.opf").async("string");
                    let PreviousEpubTocText = await PreviousEpubzip.file("OEBPS/toc.ncx").async("string");
                    let AddEpubContentText = await AddEpubzip.file("OEBPS/content.opf").async("string");
                    let AddEpubTocText = await AddEpubzip.file("OEBPS/toc.ncx").async("string");
                    let regex1, regex2, regex3, regex4, string1, string2, string3, string4;
                    try{// eslint-disable-next-line
                        while ((AddEpubTextFile = AddEpubTextFolder.file(new RegExp(("0000"+TextnumberAddEpub).slice(-4)+".+\.xhtml"))[0]) != null) {
                            let AddEpubTextFiletest = await AddEpubTextFile.async("string");
                            try{
                                // eslint-disable-next-line
                                while (AddEpubTextFiletest.search((AddEpubImageFile = AddEpubImageFolder.file(new RegExp(("0000"+ImagenumberAddEpub).slice(-4)+".+\..+"))[0]).name.replace("OEBPS/", ""))!=1) {
                                    // eslint-disable-next-line
                                    PreviousEpubzip.file(AddEpubImageFile.name.replace(("0000"+ImagenumberAddEpub).slice(-4),("0000"+ImagenumberPreviousEpub).slice(-4)), await AddEpubImageFile.async("base64"), {base64: true});
                                    AddEpubTextFiletest = AddEpubTextFiletest.replace(("/Images/0000"+ImagenumberAddEpub).slice(-4),("/Images/0000"+ImagenumberPreviousEpub).slice(-4));
                                    // eslint-disable-next-line
                                    regex1 = new RegExp('<dc:source id="id.image'+(("0000"+ImagenumberAddEpub).slice(-4))+'">'+".+?<\/dc:source>");
                                    regex2 = ("0000"+ImagenumberAddEpub).slice(-4);
                                    string1 = "</metadata>";
                                    string2 = ("0000"+ImagenumberPreviousEpub).slice(-4);
                                    PreviousEpubContentText = Library.LibManipulateContentFromTO(AddEpubContentText, PreviousEpubContentText, regex1, string1, regex2, string2);
                                    // eslint-disable-next-line
                                    regex1 = new RegExp('<item href="Images\/'+(("0000"+ImagenumberAddEpub).slice(-4))+".+?\/>");
                                    // eslint-disable-next-line
                                    regex2 = new RegExp("Images\/"+(("0000"+ImagenumberAddEpub).slice(-4))+"");
                                    // eslint-disable-next-line
                                    regex3 = new RegExp('id="image'+(("0000"+ImagenumberAddEpub).slice(-4)));
                                    string1 = "</manifest>";
                                    string2 = "Images/"+(("0000"+ImagenumberPreviousEpub).slice(-4));
                                    // eslint-disable-next-line
                                    string3 = 'id="image'+(("0000"+ImagenumberPreviousEpub).slice(-4));
                                    PreviousEpubContentText = Library.LibManipulateContentFromTO(AddEpubContentText, PreviousEpubContentText, regex1, string1, regex2, string2, regex3, string3);
                                    
                                    ImagenumberAddEpub++;
                                    ImagenumberPreviousEpub++;
                                }
                            }catch {
                            //
                            }
                            let newChaptername = AddEpubTextFile.name.replace(("0000"+TextnumberAddEpub).slice(-4),("0000"+TextnumberPreviousEpub).slice(-4));
                            PreviousEpubzip.file(newChaptername, AddEpubTextFiletest);
                            // eslint-disable-next-line
                            regex1 = new RegExp('<dc:source id="id.xhtml'+(("0000"+TextnumberAddEpub).slice(-4))+'">'+".+?<\/dc:source>");
                            regex2 = ("0000"+TextnumberAddEpub).slice(-4);
                            string1 = "</metadata>";
                            string2 = ("0000"+TextnumberPreviousEpub).slice(-4);
                            PreviousEpubContentText = Library.LibManipulateContentFromTO(AddEpubContentText, PreviousEpubContentText, regex1, string1, regex2, string2);
                            // eslint-disable-next-line
                            regex1 = new RegExp('<item href="Text\/'+(("0000"+TextnumberAddEpub).slice(-4))+".+?\/>");
                            // eslint-disable-next-line
                            regex2 = new RegExp("Text\/"+(("0000"+TextnumberAddEpub).slice(-4))+"");
                            // eslint-disable-next-line
                            regex3 = new RegExp('id="xhtml'+(("0000"+TextnumberAddEpub).slice(-4)));
                            string1 = "</manifest>";
                            string2 = "Text/"+(("0000"+TextnumberPreviousEpub).slice(-4));
                            // eslint-disable-next-line
                            string3 = 'id="xhtml'+(("0000"+TextnumberPreviousEpub).slice(-4));
                            PreviousEpubContentText = Library.LibManipulateContentFromTO(AddEpubContentText, PreviousEpubContentText, regex1, string1, regex2, string2, regex3, string3);
                            // eslint-disable-next-line
                            regex1 = new RegExp('<itemref idref="xhtml'+(("0000"+TextnumberAddEpub).slice(-4))+'"\/>');
                            regex2 = new RegExp("xhtml"+(("0000"+TextnumberAddEpub).slice(-4))+"");
                            string1 = "</spine>";
                            string2 = "xhtml"+(("0000"+TextnumberPreviousEpub).slice(-4));
                            PreviousEpubContentText = Library.LibManipulateContentFromTO(AddEpubContentText, PreviousEpubContentText, regex1, string1, regex2, string2);
                            // eslint-disable-next-line
                            regex1 = new RegExp('<navPoint id="body'+(("0000"+(TextnumberAddEpub+1)).slice(-4))+'".+?<\/navPoint>');
                            regex2 = new RegExp("body"+(("0000"+(TextnumberAddEpub+1)).slice(-4))+"");
                            // eslint-disable-next-line
                            regex3 = new RegExp('playOrder="'+(TextnumberAddEpub+1)+'"');
                            // eslint-disable-next-line
                            regex4 = new RegExp('<content src="'+AddEpubTextFile.name.slice(6)+'"\/>');
                            string1 = "</navMap>";
                            string2 = "body"+(("0000"+(TextnumberPreviousEpub+1)).slice(-4));
                            // eslint-disable-next-line
                            string3 = 'playOrder="'+(TextnumberPreviousEpub+1)+'"';
                            // eslint-disable-next-line
                            string4 = '<content src="' + newChaptername.slice(6) + '"/>';
                            PreviousEpubTocText = Library.LibManipulateContentFromTO(AddEpubTocText, PreviousEpubTocText, regex1, string1, regex2, string2, regex3, string3, regex4, string4);
                            TextnumberPreviousEpub++;
                            TextnumberAddEpub++;
                        }
                    }catch{
                    //
                    }
                    PreviousEpubzip.file("OEBPS/content.opf", PreviousEpubContentText);
                    PreviousEpubzip.file("OEBPS/toc.ncx", PreviousEpubTocText);
                    let content = await PreviousEpubzip.generateAsync({ type: "blob", mimeType: "application/epub+zip",});
                    Library.LibHandelUpdate(-1, content, items["LibStoryURL" + LibidURL], items["LibFilename" + LibidURL], LibidURL);
                    return Download.save( content, fileName, overwriteExisting, backgroundDownload);
                
                }, function (e) {
                    ErrorLog.showErrorMessage(e);
                });
            }, function (e) {
                ErrorLog.showErrorMessage(e);
            });
        });
    }


    static LibManipulateContentFromTO(ContentFrom = "", ContentTo = "", regexFrom1 = "", stringTo1 = "", regexFrom2 = "", stringTo2 = "", regexFrom3 = "", stringTo3 = "", regexFrom4 = "", stringTo4 = ""){
        return ContentTo.replace(stringTo1, ContentFrom.match(regexFrom1)[0].replace(regexFrom2, stringTo2).replace(regexFrom3, stringTo3).replace(regexFrom4, stringTo4)+stringTo1);
    }

    static LibPreviewCoverImg(f,idfromtarget) {
        let previewImage = document.getElementById(idfromtarget);
        JSZip.loadAsync(f).then(function(zip) {
            var Coverimage = zip.file(/OEBPS\/Images\/0000.+\..+/)[0];
            Coverimage.async("base64").then(function(content) {
                let CoverFiletype = Coverimage.name.split(".")[1];
                if (CoverFiletype == "svg") {
                    CoverFiletype = "svg+xml";
                }
                previewImage.src = "data:image/"+CoverFiletype+";base64," + content;
            },function(e) {
                ErrorLog.showErrorMessage(e);
            });
        }, function (e) {
            ErrorLog.showErrorMessage(e);
        });
    }

    Libdeleteall(){
        chrome.storage.local.clear();
        Library.LibRenderSavedEpubs();
    }

    static LibRenderSavedEpubs(){
        chrome.storage.local.get(null, async function(items) {
            let CurrentLibKeys = await Library.GetAllLibStorageKeys("LibEpub");
            let LibRenderResult = document.getElementById("LibRenderResult");
            let LibRenderString = "";
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                CurrentLibKeys[i] = CurrentLibKeys[i].replace("LibEpub","");
                LibRenderString += "<br>";
                LibRenderString += "<table>";
                LibRenderString += "<tbody>";
                LibRenderString += "<tr>";
                LibRenderString += "<td rowspan='3'>   <img class='LibCover' id='LibCover"+CurrentLibKeys[i]+"'></td>";
                LibRenderString += "<td colspan='2'>";
                LibRenderString += "<button data-libepubid="+CurrentLibKeys[i]+" id='LibDeleteEpub"+CurrentLibKeys[i]+"'>Delete EPUB</button>";
                LibRenderString += "<button data-libepubid="+CurrentLibKeys[i]+" id='LibSearchNewChapter"+CurrentLibKeys[i]+"'>Search new Chapters</button>";
                LibRenderString += "<button data-libepubid="+CurrentLibKeys[i]+" id='LibDownload"+CurrentLibKeys[i]+"'>Download EPUB</button>";
                LibRenderString += "</td>";
                LibRenderString += "</tr>";
                LibRenderString += "<tr>";
                LibRenderString += "<td>Story URL</td>";
                LibRenderString += "<td>";
                LibRenderString += "<input id='LibStoryURL"+CurrentLibKeys[i]+"' type='url' value='"+items["LibStoryURL"+CurrentLibKeys[i]]+"'>";
                LibRenderString += "</td>";
                LibRenderString += "</tr>";
                LibRenderString += "<tr>";
                LibRenderString += "<td>Filename</td>";
                LibRenderString += "<td><input id='LibFilename"+CurrentLibKeys[i]+"' type='text' value='"+items["LibFilename"+CurrentLibKeys[i]]+"'></td>";
                LibRenderString += "</tr>";
                LibRenderString += "</tbody>";
                LibRenderString += "</table>";
                LibRenderString += "<br>";
            }
            LibRenderResult.innerHTML = LibRenderString;
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                document.getElementById("LibDeleteEpub"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibDeleteEpub(this)});
                document.getElementById("LibSearchNewChapter"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibSearchNewChapter(this)});
                document.getElementById("LibDownload"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibDownload(this)});
                document.getElementById("LibStoryURL"+CurrentLibKeys[i]).addEventListener("change", function(){Library.LibSaveTextURLChange(this)});
                document.getElementById("LibFilename"+CurrentLibKeys[i]).addEventListener("change", function(){Library.LibSaveTextURLChange(this)});
            }
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                chrome.storage.local.get("LibEpub" + CurrentLibKeys[i], async function(items, ) {
                    Library.LibPreviewCoverImg(await (await fetch(items["LibEpub" + CurrentLibKeys[i]])).blob(),"LibCover"+CurrentLibKeys[i]);
                });
            }
            chrome.storage.local.getBytesInUse(null, function(BytesInUse) {
                document.getElementById("BytesInUse").innerHTML = "Library uses: " + Library.LibCalcBytesToReadable(BytesInUse) + "Bytes";
            });
        });
    }

    static LibCalcBytesToReadable(bytes){
        let units = ["", "K", "M", "G", "T", "P", "E", "Z", "Y"];
        let l = 0, n = parseInt(bytes, 10) || 0;
        while(n >= 1024 && ++l){
            n = n/1024;
        }
        return(n.toFixed(n < 10 && l > 0 ? 1 : 0) + " " + units[l]);
    }

    static async LibHandelUpdate(objbtn, Blobdata, StoryURL, Filename, Id){
        await Library.LibFileReaderAddListeners(LibFileReader);
        if (objbtn != -1) {
            Blobdata = objbtn.files[0];
            Filename = Blobdata.name.replace(".epub", "");
        }
        LibFileReader.LibStorageValueURL = StoryURL;
        LibFileReader.LibStorageValueFilename = Filename;
        LibFileReader.LibStorageValueId = Id;
        LibFileReader.readAsDataURL(Blobdata);
    }
    static async LibFileReaderload(){
        if (-1 == LibFileReader.LibStorageValueId) {
            let CurrentLibKeys = await Library.GetAllLibStorageKeys("LibEpub");
            let HighestLibEpub = 0;
            CurrentLibKeys.forEach(element => {
                element = element.replace("LibEpub","");
                if (parseInt(element)>=HighestLibEpub) {
                    HighestLibEpub = parseInt(element)+1; 
                }
            });
            LibFileReader.LibStorageValueId = HighestLibEpub;
        }
        chrome.storage.local.set({
            ["LibEpub" + LibFileReader.LibStorageValueId]: LibFileReader.result,
            ["LibStoryURL" + LibFileReader.LibStorageValueId]: LibFileReader.LibStorageValueURL,
            ["LibFilename" + LibFileReader.LibStorageValueId]: LibFileReader.LibStorageValueFilename
        }, function() {
            Library.LibRenderSavedEpubs();
        });
    }

    static LibFileReaderAddListeners(LibFileReader){
        LibFileReader.addEventListener("load", function(){Library.LibFileReaderload()});
        LibFileReader.addEventListener("error", function(event){Library.LibFileReadererror(event)});
        LibFileReader.addEventListener("abort", function(event){Library.LibFileReaderabort(event)});
    }

    static LibFileReadererror(event){ErrorLog.showErrorMessage(event);}
    static LibFileReaderabort(event){ErrorLog.showErrorMessage(event);}
    
    static LibDeleteEpub(objbtn){
        let LibRemove = ["LibEpub" + objbtn.dataset.libepubid, "LibStoryURL" + objbtn.dataset.libepubid, "LibFilename" + objbtn.dataset.libepubid];
        chrome.storage.local.remove(LibRemove);
        Library.LibRenderSavedEpubs();
    }

    static LibSearchNewChapter(objbtn){
        let LibGetURL = ["LibStoryURL" + objbtn.dataset.libepubid];
        chrome.storage.local.get(LibGetURL, function(items) {
            document.getElementById("startingUrlInput").value = items[LibGetURL];
            document.getElementById("libinvisbutton").click();
        });
    }

    static LibDownload(objbtn){
        let LibGetFileAndName = ["LibEpub" + objbtn.dataset.libepubid, "LibFilename" + objbtn.dataset.libepubid];
        chrome.storage.local.get(LibGetFileAndName, async function(items) {
            let userPreferences = UserPreferences.readFromLocalStorage();
            let overwriteExisting = userPreferences.overwriteExistingEpub.value;
            let backgroundDownload = userPreferences.noDownloadPopup.value;
            let blobdata = await (await fetch(items["LibEpub" + objbtn.dataset.libepubid])).blob();
            return Download.save(blobdata , items["LibFilename" + objbtn.dataset.libepubid] + ".epub", overwriteExisting, backgroundDownload);
        });
    }

    static LibSaveTextURLChange(obj){
        let LibGetFileAndName = obj.id;
        chrome.storage.local.set({
            [LibGetFileAndName]: obj.value
        });
    }

    static async GetAllLibStorageKeys(Substring){
        return new Promise((resolve) => {
            chrome.storage.local.get(null, function(items){
                var AllStorageKeys = Object.keys(items);
                var AllLibStorageKeys = [];
                for (var i = 0, end = AllStorageKeys.length; i < end; i++) {
                    if(AllStorageKeys[i].includes(Substring)){
                        AllLibStorageKeys.push(AllStorageKeys[i]);
                    }   
                }
                resolve(AllLibStorageKeys);
            });
        });
    }

}