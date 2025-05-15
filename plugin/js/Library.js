/*
  Libraryclass to save Epubs from Storys which are ongoing
*/
"use strict";

var LibFileReader = new FileReader();

class Library {
    constructor() {
    }
    
    onUserPreferencesUpdate(userPreferences) {
        Library.userPreferences = userPreferences;
    }
    
    async LibAddToLibrary(AddEpub, fileName, startingUrlInput, overwriteExisting, backgroundDownload){
        if (document.getElementById("includeInReadingListCheckbox").checked != true) {
            document.getElementById("includeInReadingListCheckbox").click();
        }
        let CurrentLibStoryURLKeys = await Library.LibGetAllLibStorageKeys("LibStoryURL");
        let CurrentLibStoryURLs = await Library.LibGetFromStorageArray(CurrentLibStoryURLKeys);
        let LibidURL = -1;
        for (let i = 0; i < CurrentLibStoryURLKeys.length; i++) {
            if (CurrentLibStoryURLs[CurrentLibStoryURLKeys[i]] == startingUrlInput) {
                LibidURL = CurrentLibStoryURLKeys[i].replace("LibStoryURL","");
                continue;
            }
        }
        if (LibidURL == -1) {
            Library.LibHandelUpdate(-1, AddEpub, document.getElementById("startingUrlInput").value, fileName.replace(".epub", ""), LibidURL);
            if (document.getElementById("LibDownloadEpubAfterUpdateCheckbox").checked) {
                return Download.save(AddEpub, fileName, overwriteExisting, backgroundDownload);
            }else{
                return new Promise((resolve) => {resolve();});
            }
        }

        let PreviousEpubBase64 = await Library.LibGetFromStorage("LibEpub" + LibidURL);
        let MergedEpub = await Library.LibMergeEpub(PreviousEpubBase64, AddEpub, LibidURL);
        if (document.getElementById("LibDownloadEpubAfterUpdateCheckbox").checked) {
            fileName = EpubPacker.addExtensionIfMissing(await Library.LibGetFromStorage("LibFilename" + LibidURL));
            if (Download.isFileNameIllegalOnWindows(fileName)) {
                ErrorLog.showErrorMessage(chrome.i18n.getMessage("errorIllegalFileName",
                    [fileName, Download.illegalWindowsFileNameChars]
                ));
                return;
            }
            return Download.save(MergedEpub, fileName, overwriteExisting, backgroundDownload);
        }else{
            return new Promise((resolve) => {resolve();});
        }
    }

    static LibHighestFileNumber(Content, Regex, String){
        let array = Content.map(a => a = a.filename).filter(a => a.match(Regex)).map(a => a = parseInt(a.substring(String.length, String.length + 4)));
        return Math.max(...array);
    }

    static async LibMergeEpub(PreviousEpubBase64, AddEpubBlob, LibidURL){
        Library.LibShowLoadingText();

        let PreviousEpubReader = await new zip.Data64URIReader(PreviousEpubBase64);
        let PreviousEpubZip = new zip.ZipReader(PreviousEpubReader, {useWebWorkers: false});
        let PreviousEpubContent = await PreviousEpubZip.getEntries();
        PreviousEpubContent = PreviousEpubContent.filter(a => a.directory == false);

        let AddEpubReader = await new zip.BlobReader(AddEpubBlob);
        let AddEpubZip = new zip.ZipReader(AddEpubReader, {useWebWorkers: false});
        let AddEpubContent = await AddEpubZip.getEntries();
        AddEpubContent = AddEpubContent.filter(a => a.directory == false);

        let MergedEpubWriter = new zip.BlobWriter("application/epub+zip");
        let MergedEpubZip = new zip.ZipWriter(MergedEpubWriter,{useWebWorkers: false,compressionMethod: 8, extendedTimestamp: false});
        //Copy PreviousEpub in MergedEpub
        for (let element of PreviousEpubContent.filter(a => a.filename != "OEBPS/content.opf" && a.filename != "OEBPS/toc.ncx" && a.filename != "OEBPS/toc.xhtml")){
            if (element.filename == "mimetype") {
                MergedEpubZip.add(element.filename, new zip.TextReader(await element.getData(new zip.TextWriter())), {compressionMethod: 0});
                continue;
            }
            MergedEpubZip.add(element.filename, new zip.BlobReader(await element.getData(new zip.BlobWriter())));
        }

        let ImagenumberPreviousEpub = Library.LibHighestFileNumber(PreviousEpubContent, new RegExp("OEBPS/Images/[0-9]{4}"), "OEBPS/Images/") + 1;
        let TextnumberPreviousEpub = Library.LibHighestFileNumber(PreviousEpubContent, new RegExp("OEBPS/Text/[0-9]{4}"), "OEBPS/Text/") + 1;

        let AddEpubImageFolder = AddEpubContent.filter(a => a.filename.match(new RegExp("OEBPS/Images/[0-9]{4}")));
        let AddEpubImageFolderFilenames = AddEpubImageFolder.map(a => a = a.filename).sort();
        let AddEpubTextFolder = AddEpubContent.filter(a => a.filename.match(new RegExp("OEBPS/Text/[0-9]{4}")));
        let ImagenumberAddEpubIndex = 1;
        let TextnumberAddEpub = 0;
        let NewChapter = 0;
        if (AddEpubTextFolder.filter( a => a.filename == "OEBPS/Text/0000_Information.xhtml").length != 0) {
            TextnumberAddEpub++;
        }
        let AddEpubTextFile;
        let AddEpubImageFile;
        let PreviousEpubContentText = await PreviousEpubContent.filter( a => a.filename == "OEBPS/content.opf")[0].getData(new zip.TextWriter());
        let PreviousEpubTocText = await PreviousEpubContent.filter( a => a.filename == "OEBPS/toc.ncx")[0].getData(new zip.TextWriter());
        let PreviousEpubTocEpub3Text =  await (PreviousEpubContent.filter( a => a.filename == "OEBPS/toc.xhtml"))?.[0]?.getData(new zip.TextWriter());
        let AddEpubContentText = await AddEpubContent.filter( a => a.filename == "OEBPS/content.opf")[0].getData(new zip.TextWriter());
        let AddEpubTocText = await AddEpubContent.filter( a => a.filename == "OEBPS/toc.ncx")[0].getData(new zip.TextWriter());

        let regex1, regex2, regex3, regex4, string1, string2, string3, string4;
        // eslint-disable-next-line
        while ((AddEpubTextFile = AddEpubTextFolder.filter(a => a.filename.match(new RegExp("^OEBPS/Text/" + ("0000"+TextnumberAddEpub).slice(-4)+".+\.xhtml")))).length != 0) {

            AddEpubTextFile = AddEpubTextFile[0];
            let AddEpubTextFilestring = await AddEpubTextFile.getData(new zip.TextWriter());
            // eslint-disable-next-line
            while ((AddEpubImageFile = AddEpubImageFolder.filter(a => a.filename == AddEpubImageFolderFilenames[ImagenumberAddEpubIndex])).length != 0) {
                AddEpubImageFile = AddEpubImageFile[0];
                let ImagenumberAddEpub = parseInt(AddEpubImageFile.filename.substring(13, 17));
                if (AddEpubTextFilestring.search(AddEpubImageFile.filename.replace("OEBPS/", ""))==-1) {
                    break;
                }
                // eslint-disable-next-line
                MergedEpubZip.add(AddEpubImageFile.filename.replace(("0000"+ImagenumberAddEpub).slice(-4),("0000"+ImagenumberPreviousEpub).slice(-4)),  new zip.BlobReader(await AddEpubImageFile.getData(new zip.BlobWriter())));
                AddEpubTextFilestring = AddEpubTextFilestring.replace(AddEpubImageFile.filename.replace("OEBPS", ""), AddEpubImageFile.filename.replace("OEBPS", "").replace(("/Images/0000"+ImagenumberAddEpub).slice(-4), ("/Images/0000"+ImagenumberPreviousEpub).slice(-4)));
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
                ImagenumberAddEpubIndex++;
                ImagenumberPreviousEpub++;
            }
            let newChaptername = AddEpubTextFile.filename.replace(("0000"+TextnumberAddEpub).slice(-4),("0000"+TextnumberPreviousEpub).slice(-4));
            MergedEpubZip.add(newChaptername, new zip.TextReader(AddEpubTextFilestring));
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
            regex4 = new RegExp('<content src="'+AddEpubTextFile.filename.slice(6)+'"\/>');
            string1 = "</navMap>";
            string2 = "body"+(("0000"+(TextnumberPreviousEpub+1)).slice(-4));
            // eslint-disable-next-line
            string3 = 'playOrder="'+(TextnumberPreviousEpub+1)+'"';
            // eslint-disable-next-line
            string4 = '<content src="' + newChaptername.slice(6) + '"/>';
            PreviousEpubTocText = Library.LibManipulateContentFromTO(AddEpubTocText, PreviousEpubTocText, regex1, string1, regex2, string2, regex3, string3, regex4, string4);
            if (PreviousEpubTocEpub3Text != null) {
                string1 = "</ol></nav>";
                regex2 = new RegExp(".+<text>");
                regex3 = new RegExp("</text>.+");
                string2 = "<li><a href=\""+ newChaptername.slice(6) + "\">"+AddEpubTocText.match(regex1)[0].replace(regex2, "").replace(regex3, "")+"</a></li>";
                PreviousEpubTocEpub3Text = PreviousEpubTocEpub3Text.replace(string1, string2+string1);
            }
            TextnumberPreviousEpub++;
            TextnumberAddEpub++;
            NewChapter++;
        }
        MergedEpubZip.add("OEBPS/content.opf", new zip.TextReader(PreviousEpubContentText));
        MergedEpubZip.add("OEBPS/toc.ncx", new zip.TextReader(PreviousEpubTocText));
        if (PreviousEpubTocEpub3Text != null) {
            MergedEpubZip.add("OEBPS/toc.xhtml", new zip.TextReader(PreviousEpubTocEpub3Text));
        }
        let content = await MergedEpubZip.close();
        Library.LibHandelUpdate(-1, content, await Library.LibGetFromStorage("LibStoryURL" + LibidURL), await Library.LibGetFromStorage("LibFilename" + LibidURL), LibidURL, NewChapter);
        return content;
    }

    static LibManipulateContentFromTO(ContentFrom = "", ContentTo = "", regexFrom1 = "", stringTo1 = "", regexFrom2 = "", stringTo2 = "", regexFrom3 = "", stringTo3 = "", regexFrom4 = "", stringTo4 = ""){
        return ContentTo.replace(stringTo1, ContentFrom.match(regexFrom1)[0].replace(regexFrom2, stringTo2).replace(regexFrom3, stringTo3).replace(regexFrom4, stringTo4)+stringTo1);
    }

    static async LibSaveCoverImgInStorage(idfromepub) {
        return new Promise((resolve) => {
            chrome.storage.local.get("LibEpub" + idfromepub, async function(items, ) {
                try{
                    let EpubReader = await new zip.Data64URIReader(items["LibEpub" + idfromepub])
                    let EpubZip = new zip.ZipReader(EpubReader, {useWebWorkers: false});
                    let EpubContent =  await EpubZip.getEntries();
                    EpubContent = EpubContent.filter(a => a.directory == false);

                    let Coverxml = await EpubContent.filter( a => a.filename == "OEBPS/Text/Cover.xhtml")[0].getData(new zip.TextWriter());
                    let CoverimgPath = "OEBPS"+Coverxml.match(/"..\/Images\/000.+?"/)[0].replace(/"../,"").replace("\"","");
                    let Coverimage = await EpubContent.filter( a => a.filename == CoverimgPath)[0].getData(new zip.Data64URIWriter());

                    let CoverFiletype = CoverimgPath.split(".")[1];
                    if (CoverFiletype == "svg") {
                        CoverFiletype = "svg+xml";
                    }
                    let Cover = Coverimage.replace("data:;base64,", "data:image/"+CoverFiletype+";base64,");
                    chrome.storage.local.set({
                        ["LibCover" + idfromepub]: Cover
                    }, function() {
                        resolve();
                    });
                } catch {
                    let no_cover_svg = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIxNjFweCIgaGVpZ2h0PSIxODFweCIgdmlld0JveD0iLTAuNSAtMC41IDE2MSAxODEiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48ZGVmcy8+PGc+PHJlY3QgeD0iMCIgeT0iMy4yNCIgd2lkdGg9IjE2MCIgaGVpZ2h0PSIxNzMuNTIiIGZpbGw9InJnYigyNTUsIDI1NSwgMjU1KSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz48cmVjdCB4PSI0Mi4wNyIgeT0iMzMuMjkiIHdpZHRoPSI3NS44NyIgaGVpZ2h0PSI3NS4xMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZS13aWR0aD0iNC41MSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSI2Ni4xIiBjeT0iNTEuMzEiIHJ4PSI2LjAwOTM4OTY3MTM2MTUwMiIgcnk9IjYuMDA5Mzg5NjcxMzYxNTAyIiBmaWxsPSJub25lIiBzdHJva2U9InJnYigwLCAwLCAwKSIgc3Ryb2tlLXdpZHRoPSI0LjUxIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PHBhdGggZD0iTSA0Mi4wNyA5MC4zOCBMIDU3LjA5IDcwLjg1IEwgNzIuMTEgOTcuODkgTCA5MS42NCA1Mi44MiBMIDExNy45MyAxMDAuODkiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2Utd2lkdGg9IjQuNTEiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxnIGZpbGw9IiMwMDAwMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCxIZWx2ZXRpY2EiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjIyLjUzNTIxMTI2NzYwNTYzMnB4Ij48dGV4dCB4PSI3OS41IiB5PSIxNDUuNzQiPk5vIGltYWdlPC90ZXh0PjwvZz48ZyBmaWxsPSIjMDAwMDAwIiBmb250LWZhbWlseT0iQXJpYWwsSGVsdmV0aWNhIiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIyMi41MzUyMTEyNjc2MDU2MzJweCI+PHRleHQgeD0iNzkuNSIgeT0iMTYzLjk5Ij5hdmFpbGFibGU8L3RleHQ+PC9nPjwvZz48L3N2Zz4=";
                    chrome.storage.local.set({
                        ["LibCover" + idfromepub]: no_cover_svg
                    }, function() {
                        resolve();
                    });
                }
            });
        });
    }

    static Libdeleteall(){
        Library.LibShowLoadingText();
        chrome.storage.local.get(null, async function(items) {
            let CurrentLibKeys = await Library.LibGetAllLibStorageKeys("LibEpub", Object.keys(items));
            let storyurls = [];
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                CurrentLibKeys[i] = CurrentLibKeys[i].replace("LibEpub","");
            }
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                storyurls[i] = items["LibStoryURL" + CurrentLibKeys[i]];
            }
            for (let i = 0; i < storyurls.length; i++) {
                Library.userPreferences.readingList.tryDeleteEpubAndSave(storyurls[i]);
            }
            chrome.storage.local.clear();
            Library.LibRenderSavedEpubs();
        });
    }

    static async LibChangeOrder(libepubid, change){
        let LibArray = [];
        LibArray = await Library.LibGetFromStorage("LibArray");
        for (let i = 0; i < LibArray.length; i++) {
            if (LibArray[i] == libepubid) {
                if (i+change < 0 || i+change >= LibArray.length) {
                    return;
                }
                let temp1 = LibArray[i];
                LibArray[i] = LibArray[i+change];
                LibArray[i+change] = temp1;
                break;
            }
        }
        chrome.storage.local.set({
            ["LibArray"]: LibArray
        });
        Library.LibRenderSavedEpubs();
    }

    static LibChangeOrderUp(objbtn){
        Library.LibChangeOrder(objbtn.dataset.libepubid, -1);
    }

    static LibChangeOrderDown(objbtn){
        Library.LibChangeOrder(objbtn.dataset.libepubid, 1);
    }

    static async LibCreateStorageIDs(AppendID){
        let LibArray = [];
        if (AppendID == undefined) {
            let CurrentLibKeys = await Library.LibGetAllLibStorageKeys("LibEpub");
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                LibArray.push(CurrentLibKeys[i].replace("LibEpub",""));
            }
        } else {
            LibArray = await Library.LibGetFromStorage("LibArray");
            if (LibArray.filter(a => a == AppendID).length > 0) {
                return;
            }
            LibArray.push(AppendID);
        }
        chrome.storage.local.set({
            ["LibArray"]: LibArray
        });
    }

    static async LibRemoveStorageIDs(RemoveID){
        let LibArray = await Library.LibGetFromStorage("LibArray");
        if (LibArray == undefined) {
            await Library.LibCreateStorageIDs();
            return Library.LibGetStorageIDs();
        }
        LibArray = LibArray.filter(a => a != RemoveID);
        chrome.storage.local.set({
            ["LibArray"]: LibArray
        });
    }

    static async LibGetStorageIDs(){
        let LibArray = await Library.LibGetFromStorage("LibArray");
        if (LibArray == undefined) {
            await Library.LibCreateStorageIDs();
            return Library.LibGetStorageIDs();
        }
        return LibArray;
    }

    static async LibRenderSavedEpubs(){
        let LibArray = await Library.LibGetStorageIDs();
        let ShowAdvancedOptions = document.getElementById("LibShowAdvancedOptionsCheckbox").checked;
        let ShowCompactView = document.getElementById("LibShowCompactViewCheckbox").checked;
        let CurrentLibKeys = LibArray;
        let LibRenderResult = document.getElementById("LibRenderResult");
        let LibRenderString = "";
        let LibTemplateDeleteEpub = document.getElementById("LibTemplateDeleteEpub").innerHTML;
        let LibTemplateSearchNewChapter = document.getElementById("LibTemplateSearchNewChapter").innerHTML;
        let LibTemplateUpdateNewChapter = document.getElementById("LibTemplateUpdateNewChapter").innerHTML;
        let LibTemplateDownload = document.getElementById("LibTemplateDownload").innerHTML;
        let LibTemplateNewChapter = document.getElementById("LibTemplateNewChapter").innerHTML;
        let LibTemplateURL = document.getElementById("LibTemplateURL").innerHTML;
        let LibTemplateFilename = document.getElementById("LibTemplateFilename").innerHTML;
        let LibTemplateMergeUploadButton = "";
        let LibTemplateEditMetadataButton = "";

        LibRenderString += "<div class='LibDivRenderWraper'>";
        document.getElementById("LibShowCompactViewRow").hidden = !ShowAdvancedOptions;
        document.getElementById("LibDownloadEpubAfterUpdateRow").hidden = !ShowAdvancedOptions;
        if (ShowAdvancedOptions) {
            if (!util.isFirefox()) {
                let LibTemplateLibraryUses = document.getElementById("LibTemplateLibraryUses").innerHTML;
                LibRenderString += "<span>" + LibTemplateLibraryUses + "</span>";
                LibRenderString += "<span id='LibLibraryUses'></span>";
                LibRenderString += "<br>";
            }
            LibTemplateMergeUploadButton = document.getElementById("LibTemplateMergeUploadButton").innerHTML;
            LibTemplateEditMetadataButton = document.getElementById("LibTemplateEditMetadataButton").innerHTML;
            LibRenderString += "<button id='libdeleteall'>"+document.getElementById("LibTemplateClearLibrary").innerHTML+"</button>";
            LibRenderString += "<button id='libexportall'>"+document.getElementById("LibTemplateExportLibrary").innerHTML+"</button>";
            LibRenderString += "<label data-libbuttonid='LibImportLibraryButton' data-libepubid='' id='LibImportLibraryLabel' for='LibImportLibraryFile' style='cursor: pointer;'>";
            LibRenderString += "<button id='LibImportLibraryButton' style='pointer-events: none;'>"+document.getElementById("LibTemplateImportEpubButton").innerHTML+"</button></label>";
            LibRenderString += "<input type='file' data-libepubid='LibImportLibrary' id='LibImportLibraryFile' hidden>";
            LibRenderString += "<br>";
            LibRenderString += "<p>"+document.getElementById("LibTemplateUploadEpubFileLabel").innerHTML+"</p>";
            LibRenderString += "<label data-libbuttonid='LibUploadEpubButton' data-libepubid='' id='LibUploadEpubLabel' for='LibEpubNewUploadFile' style='cursor: pointer;'>";
            LibRenderString += "<button id='LibUploadEpubButton' style='pointer-events: none;'>"+document.getElementById("LibTemplateUploadEpubButton").innerHTML+"</button></label>";
            LibRenderString += "<input type='file' data-libepubid='LibEpubNew' id='LibEpubNewUploadFile' hidden>";
            LibRenderString += "<br>";
            LibRenderString += "<textarea id='LibAddListToLibraryInput' type='text'>Add one novel per line</textarea>";
            LibRenderString += "<br>";
            LibRenderString += "<button id='LibAddListToLibraryButton'>"+document.getElementById("LibTemplateAddListToLibrary").innerHTML+"</button>";
            
        }
        LibRenderString += "<div style='display:flex; justify-content: center;'>";
        LibRenderString += "<button id='libupdateall'>"+document.getElementById("LibTemplateUpdateAll").innerHTML+"</button>";
        LibRenderString += "</div>";
        if ( ShowCompactView && !ShowAdvancedOptions) {
            LibRenderString += "<table>";
            LibRenderString += "<tbody>";
            let column = 5;
            for (let i = 0; i < CurrentLibKeys.length; i = i + column) {
                LibRenderString += "<tr>";
                for (let j = i; j < CurrentLibKeys.length && j < column + i; j++) {
                    LibRenderString += "<td style='height: 1.2em;'>";
                    LibRenderString += "<div style='display:flex; justify-content: center;'>";
                    LibRenderString += "<span style='padding: 0em; font-size: 1.2em; color: Chartreuse;' id='LibNewChapterCount"+CurrentLibKeys[j]+"'></span>";
                    LibRenderString += "</div>";
                    LibRenderString += "</td>";
                }
                LibRenderString += "</tr>";
                LibRenderString += "<tr>";
                for (let j = i; j < CurrentLibKeys.length && j < column + i; j++) {
                    LibRenderString += "<td>";
                    LibRenderString += "<img data-libepubid="+CurrentLibKeys[j]+" style='cursor: pointer; max-height: "+(772/column)+"px; max-width: "+(603/column)+"px;' class='LibCoverCompact' id='LibCover"+CurrentLibKeys[j]+"'>";
                    LibRenderString += "</td>";
                }
                LibRenderString += "</tr>";
            }
            LibRenderString += "</tbody>";
            LibRenderString += "</table>";
            LibRenderString += "</div>";
            Library.AppendHtmlInDiv(LibRenderString, LibRenderResult, "LibDivRenderWraper");
            document.getElementById("libupdateall").addEventListener("click", function(){Library.Libupdateall()});
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                document.getElementById("LibCover"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibDownload(this)});
            }
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                document.getElementById("LibCover"+CurrentLibKeys[i]).src = await Library.LibGetFromStorage("LibCover" + CurrentLibKeys[i]);
                let newChapterHTML = (((await Library.LibGetFromStorage("LibNewChapterCount"+CurrentLibKeys[i]) || 0) == 0)? "" : await Library.LibGetFromStorage("LibNewChapterCount"+CurrentLibKeys[i]) + LibTemplateNewChapter);
                newChapterHTML = "<span class=\"newChapterWraper\">"+newChapterHTML+"</span>";
                Library.AppendHtmlInDiv(newChapterHTML, document.getElementById("LibNewChapterCount"+CurrentLibKeys[i]), "newChapterWraper");
            }
        } else {
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                LibRenderString += "<br>";
                LibRenderString += "<table>";
                LibRenderString += "<tbody>";
                LibRenderString += "<tr>";
                LibRenderString += "<td style='height: 115.5px; width: 106.5px;' rowspan='4'>   <img class='LibCover' id='LibCover"+CurrentLibKeys[i]+"'></td>";
                LibRenderString += "<td colspan='2'>";
                if (ShowAdvancedOptions) {
                    LibRenderString += "<button data-libepubid="+CurrentLibKeys[i]+" id='LibChangeOrderUp"+CurrentLibKeys[i]+"'>↑</button>";
                    LibRenderString += "<button data-libepubid="+CurrentLibKeys[i]+" id='LibChangeOrderDown"+CurrentLibKeys[i]+"'>↓</button>";
                }
                LibRenderString += "<button data-libepubid="+CurrentLibKeys[i]+" id='LibDeleteEpub"+CurrentLibKeys[i]+"'>"+LibTemplateDeleteEpub+"</button>";
                LibRenderString += "<button data-libepubid="+CurrentLibKeys[i]+" id='LibUpdateNewChapter"+CurrentLibKeys[i]+"'>"+LibTemplateUpdateNewChapter+"</button>";
                LibRenderString += "<button data-libepubid="+CurrentLibKeys[i]+" id='LibDownload"+CurrentLibKeys[i]+"'>"+LibTemplateDownload+"</button>";
                LibRenderString += "<span style='padding: 1em; font-size: 1.2em; color: Chartreuse;' id='LibNewChapterCount"+CurrentLibKeys[i]+"'></span>";
                if (ShowAdvancedOptions) {
                    LibRenderString += "</td>";
                    LibRenderString += "</tr>";
                    LibRenderString += "<tr>";
                    LibRenderString += "<td colspan='2'>";
                    LibRenderString += "<label id='LibMergeUploadLabel"+CurrentLibKeys[i]+"' data-libbuttonid='LibMergeUploadButton' data-libepubid="+CurrentLibKeys[i]+" for='LibMergeUpload"+CurrentLibKeys[i]+"' style='cursor: pointer;'>";
                    LibRenderString += "<button id='LibMergeUploadButton"+CurrentLibKeys[i]+"' style='pointer-events: none;'>"+LibTemplateMergeUploadButton+"</button></label>";
                    LibRenderString += "<input type='file' data-libepubid="+CurrentLibKeys[i]+" id='LibMergeUpload"+CurrentLibKeys[i]+"' hidden>";
                    LibRenderString += "<button data-libepubid="+CurrentLibKeys[i]+" id='LibSearchNewChapter"+CurrentLibKeys[i]+"'>"+LibTemplateSearchNewChapter+"</button>";
                    LibRenderString += "<button data-libepubid="+CurrentLibKeys[i]+" id='LibEditMetadata"+CurrentLibKeys[i]+"'>"+LibTemplateEditMetadataButton+"</button>";
                }
                LibRenderString += "</td>";
                LibRenderString += "</tr>";
                LibRenderString += "<tr>";
                LibRenderString += "<td>"+LibTemplateURL+"</td>";
                LibRenderString += "<td style='padding:0;'>";
                LibRenderString += "<table style='border-spacing:0;'>";
                LibRenderString += "<tbody id='LibURLWarning"+CurrentLibKeys[i]+"'>";
                LibRenderString += "<tr><td></td></tr>";
                LibRenderString += "</tbody>";
                LibRenderString += "<tbody>";
                LibRenderString += "<tr><td style='padding:0;'>";
                LibRenderString += "<input data-libepubid="+CurrentLibKeys[i]+" id='LibStoryURL"+CurrentLibKeys[i]+"' type='url' value=''>";
                LibRenderString += "</td></tr>";
                LibRenderString += "</tbody>";
                LibRenderString += "</table>";
                LibRenderString += "</td>";
                LibRenderString += "</tr>";
                LibRenderString += "<tr>";
                LibRenderString += "<td>"+LibTemplateFilename+"</td>";
                LibRenderString += "<td><input id='LibFilename"+CurrentLibKeys[i]+"' type='text' value=''></td>";
                LibRenderString += "</tr>";
                LibRenderString += "</tbody>";
                LibRenderString += "</table>";
                if (ShowAdvancedOptions) {
                    LibRenderString += "<div id='LibRenderMetadata"+CurrentLibKeys[i]+"'></div>";
                }
            }
            LibRenderString += "</div>";
            Library.AppendHtmlInDiv(LibRenderString, LibRenderResult, "LibDivRenderWraper");
            document.getElementById("libupdateall").addEventListener("click", function(){Library.Libupdateall()});
            if (ShowAdvancedOptions) {
                document.getElementById("libdeleteall").addEventListener("click", function(){Library.Libdeleteall()});
                document.getElementById("libexportall").addEventListener("click", function(){Library.Libexportall()});
                document.getElementById("LibImportLibraryLabel").addEventListener("mouseover", function(){Library.LibMouseoverButtonUpload(this)});
                document.getElementById("LibImportLibraryLabel").addEventListener("mouseout", function(){Library.LibMouseoutButtonUpload(this)});
                document.getElementById("LibImportLibraryFile").addEventListener("change", function(){Library.LibHandelImport(this)});
                document.getElementById("LibUploadEpubLabel").addEventListener("mouseover", function(){Library.LibMouseoverButtonUpload(this)});
                document.getElementById("LibUploadEpubLabel").addEventListener("mouseout", function(){Library.LibMouseoutButtonUpload(this)});
                document.getElementById("LibEpubNewUploadFile").addEventListener("change", function(){Library.LibHandelUpdate(this, -1, "", "", -1)});
                document.getElementById("LibAddListToLibraryButton").addEventListener("click", function(){Library.LibAddListToLibrary()});
            }
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                document.getElementById("LibDeleteEpub"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibDeleteEpub(this)});
                document.getElementById("LibUpdateNewChapter"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibUpdateNewChapter(this)});
                document.getElementById("LibDownload"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibDownload(this)});
                document.getElementById("LibStoryURL"+CurrentLibKeys[i]).addEventListener("change", function(){Library.LibSaveTextURLChange(this)});
                document.getElementById("LibStoryURL"+CurrentLibKeys[i]).addEventListener("focusin", function(){Library.LibShowTextURLWarning(this)});
                document.getElementById("LibStoryURL"+CurrentLibKeys[i]).addEventListener("focusout", function(){Library.LibHideTextURLWarning(this)});
                document.getElementById("LibFilename"+CurrentLibKeys[i]).addEventListener("change", function(){Library.LibSaveTextURLChange(this)});
                if (ShowAdvancedOptions) {
                    document.getElementById("LibChangeOrderUp"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibChangeOrderUp(this)});
                    document.getElementById("LibChangeOrderDown"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibChangeOrderDown(this)});
                    document.getElementById("LibMergeUpload"+CurrentLibKeys[i]).addEventListener("change", function(){Library.LibMergeUpload(this)});
                    document.getElementById("LibMergeUploadLabel"+CurrentLibKeys[i]).addEventListener("mouseover", function(){Library.LibMouseoverButtonUpload(this)});
                    document.getElementById("LibMergeUploadLabel"+CurrentLibKeys[i]).addEventListener("mouseout", function(){Library.LibMouseoutButtonUpload(this)});
                    document.getElementById("LibSearchNewChapter"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibSearchNewChapter(this)});
                    document.getElementById("LibEditMetadata"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibEditMetadata(this)});
                }
            }
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                document.getElementById("LibCover"+CurrentLibKeys[i]).src = await Library.LibGetFromStorage("LibCover" + CurrentLibKeys[i]);                
                let newChapterHTML = (((await Library.LibGetFromStorage("LibNewChapterCount"+CurrentLibKeys[i]) || 0) == 0)? "" : await Library.LibGetFromStorage("LibNewChapterCount"+CurrentLibKeys[i]) + LibTemplateNewChapter);
                newChapterHTML = "<span class=\"newChapterWraper\">"+newChapterHTML+"</span>";
                Library.AppendHtmlInDiv(newChapterHTML, document.getElementById("LibNewChapterCount"+CurrentLibKeys[i]), "newChapterWraper");
                document.getElementById("LibStoryURL"+CurrentLibKeys[i]).value = await Library.LibGetFromStorage("LibStoryURL"+CurrentLibKeys[i]);
                document.getElementById("LibFilename"+CurrentLibKeys[i]).value = await Library.LibGetFromStorage("LibFilename"+CurrentLibKeys[i]);
            }
            if (ShowAdvancedOptions) {
                if (!util.isFirefox()) {
                    let LibraryUsesHTML = await Library.LibBytesInUse();
                    LibraryUsesHTML = "<span class=\"LibraryUsesWraper\">"+LibraryUsesHTML+"</span>";
                    Library.AppendHtmlInDiv(LibraryUsesHTML, document.getElementById("LibLibraryUses"), "LibraryUsesWraper");
                }
            }
        }
    }

    static LibMouseoverButtonUpload(objbtn){
        let i,j, sel = /button:hover/, aProperties = [];
        for(i = 0; i < document.styleSheets.length; ++i){
            if(document.styleSheets[i]. cssRules !== null) {
                for(j = 0; j < document.styleSheets[i].cssRules.length; ++j){    
                    if(sel.test(document.styleSheets[i].cssRules[j].selectorText)){
                        aProperties.push(document.styleSheets[i].cssRules[j].style.cssText);
                    }
                }
            }
        }
        aProperties.push("pointer-events: none;");
        document.getElementById(objbtn.dataset.libbuttonid+objbtn.dataset.libepubid).style.cssText = aProperties.join(" ");
    }

    static LibMouseoutButtonUpload(objbtn){
        document.getElementById(objbtn.dataset.libbuttonid+objbtn.dataset.libepubid).style.cssText ="pointer-events: none;";
    }
    
    static async LibBytesInUse(){
        return new Promise((resolve) => {
            chrome.storage.local.getBytesInUse(null, function(BytesInUse) {
                resolve(Library.LibCalcBytesToReadable(BytesInUse) + "Bytes");
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

    static LibMergeUploadButton(objbtn){
        document.getElementById("LibMergeUpload"+objbtn.dataset.libepubid).click();
    }
    
    static async LibMergeUpload(objbtn){
        let PreviousEpubBase64 = await Library.LibGetFromStorage("LibEpub" + objbtn.dataset.libepubid);
        let AddEpubBlob = objbtn.files[0];
        Library.LibMergeEpub(PreviousEpubBase64, AddEpubBlob, objbtn.dataset.libepubid);
    }
    
    static async LibEditMetadata(objbtn){
        let LibTemplateMetadataSave = document.getElementById("LibTemplateMetadataSave").innerHTML;
        let LibTemplateMetadataTitle = document.getElementById("LibTemplateMetadataTitle").innerHTML;
        let LibTemplateMetadataAuthor = document.getElementById("LibTemplateMetadataAuthor").innerHTML;
        let LibTemplateMetadataLanguage = document.getElementById("LibTemplateMetadataLanguage").innerHTML;
        let LibTemplateMetadataSubject = document.getElementById("LibTemplateMetadataSubject").innerHTML;
        let LibTemplateMetadataDescription = document.getElementById("LibTemplateMetadataDescription").innerHTML;
        let LibRenderResult = document.getElementById("LibRenderMetadata" + objbtn.dataset.libepubid);
        let LibMetadata = await Library.LibGetMetadata(objbtn.dataset.libepubid);
        let LibRenderString = "";
        LibRenderString += "<div class='LibDivRenderWraper'>";
        LibRenderString += "<table>";
        LibRenderString += "<tbody>";
        LibRenderString += "<tr id='LibRenderMetadataSave"+objbtn.dataset.libepubid+"'>";
        LibRenderString += "<td></td>";
        LibRenderString += "<td></td>";
        LibRenderString += "<td>";
        LibRenderString += "<button data-libepubid="+objbtn.dataset.libepubid+" id='LibMetadataSave"+objbtn.dataset.libepubid+"'>"+LibTemplateMetadataSave+"</button>";
        LibRenderString += "</td>";
        LibRenderString += "</tr>";
        LibRenderString += "<tr id='LibRenderMetadataTitle"+objbtn.dataset.libepubid+"'>";
        LibRenderString += "<td>"+LibTemplateMetadataTitle+"</td>";
        LibRenderString += "<td colspan='2'><input id='LibTitleInput"+objbtn.dataset.libepubid+"' type='text' value='"+LibMetadata[0]+"'></input></td>";
        LibRenderString += "</tr>";
        LibRenderString += "</tr>";
        LibRenderString += "<tr id='LibTemplateMetadataAuthor"+objbtn.dataset.libepubid+"'>";
        LibRenderString += "<td>"+LibTemplateMetadataAuthor+"</td>";
        LibRenderString += "<td colspan='2'><input id='LibAutorInput"+objbtn.dataset.libepubid+"' type='text' value='"+LibMetadata[1]+"'></input></td>";
        LibRenderString += "</tr>";
        LibRenderString += "<tr id='LibTemplateMetadataLanguage"+objbtn.dataset.libepubid+"'>";
        LibRenderString += "<td>"+LibTemplateMetadataLanguage+"</td>";
        LibRenderString += "<td colspan='2'><input id='LibLanguageInput"+objbtn.dataset.libepubid+"' type='text' value='"+LibMetadata[2]+"'></input></td>";
        LibRenderString += "</tr>";
        LibRenderString += "<tr id='LibRenderMetadataSubject"+objbtn.dataset.libepubid+"'>";
        LibRenderString += "<td>"+LibTemplateMetadataSubject+"</td>";
        LibRenderString += "<td colspan='2'><textarea rows='2' cols='60' id='LibSubjectInput"+objbtn.dataset.libepubid+"' type='text' name='subjectInput'>"+LibMetadata[3]+"</textarea></td>";
        LibRenderString += "</tr>";
        LibRenderString += "<tr id='LibRenderMetadataDescription" + objbtn.dataset.libepubid + "'>";
        LibRenderString += "<td>"+LibTemplateMetadataDescription+"</td>";
        LibRenderString += "<td colspan='2'><textarea  rows='2' cols='60' id='LibDescriptionInput"+objbtn.dataset.libepubid+"' type='text' name='descriptionInput'>"+LibMetadata[4]+"</textarea></td>";
        LibRenderString += "</tr>";
        LibRenderString += "</tbody>";
        LibRenderString += "</table>";
        LibRenderString += "</div>";
        Library.AppendHtmlInDiv(LibRenderString, LibRenderResult, "LibDivRenderWraper");
        document.getElementById("LibMetadataSave"+objbtn.dataset.libepubid).addEventListener("click", function(){Library.LibSaveMetadataChange(this)});
    }

    static async LibSaveMetadataChange(obj){
        let LibTitleInput = document.getElementById("LibTitleInput"+obj.dataset.libepubid).value;
        let LibAutorInput = document.getElementById("LibAutorInput"+obj.dataset.libepubid).value;
        let LibLanguageInput = document.getElementById("LibLanguageInput"+obj.dataset.libepubid).value;
        let LibSubjectInput = document.getElementById("LibSubjectInput"+obj.dataset.libepubid).value;
        let LibDescriptionInput = document.getElementById("LibDescriptionInput"+obj.dataset.libepubid).value;
        Library.LibShowLoadingText();
        let LibDateCreated = new EpubPacker().getDateForMetaData();
        try {
            let EpubReader = await new zip.Data64URIReader(await Library.LibGetFromStorage("LibEpub"+obj.dataset.libepubid))
            let EpubZipRead = new zip.ZipReader(EpubReader, {useWebWorkers: false});
            let EpubContent =  await EpubZipRead.getEntries();
            EpubContent = EpubContent.filter(a => a.directory == false);
            let opfFile = await EpubContent.filter(a => a.filename == "OEBPS/content.opf")[0].getData(new zip.TextWriter());
            
            let EpubWriter = new zip.BlobWriter("application/epub+zip");
            let EpubZipWrite = new zip.ZipWriter(EpubWriter,{useWebWorkers: false,compressionMethod: 8});
            //Copy Epub in NewEpub
            for (let element of EpubContent.filter(a => a.filename != "OEBPS/content.opf")){
                EpubZipWrite.add(element.filename, new zip.BlobReader(await element.getData(new zip.BlobWriter())));
            }
            
            let regex1 = opfFile.match(new RegExp("<dc:title>.+?</dc:creator>", "gs"));
            if ( regex1 == null) {
                ErrorLog.showErrorMessage(chrome.i18n.getMessage("errorEditMetadata"));
                return;
            }
            let LibSaveMetadataString = "";
            LibSaveMetadataString += "<dc:title>"+LibTitleInput+"</dc:title>";
            LibSaveMetadataString += "<dc:language>"+LibLanguageInput+"</dc:language>";
            LibSaveMetadataString += "<dc:date>"+LibDateCreated+"</dc:date>";
            LibSaveMetadataString += "<dc:subject>"+LibSubjectInput+"</dc:subject>";
            LibSaveMetadataString += "<dc:description>"+LibDescriptionInput+"</dc:description>";
            LibSaveMetadataString += "<dc:creator opf:file-as=\""+LibAutorInput+"\" opf:role=\"aut\">"+LibAutorInput+"</dc:creator>";

            opfFile = opfFile.replace(new RegExp("<dc:title>.+?</dc:creator>", "gs"), LibSaveMetadataString);

            EpubZipWrite.add("OEBPS/content.opf", new zip.TextReader(opfFile));
            let content = await EpubZipWrite.close();
            Library.LibHandelUpdate(-1, content, await Library.LibGetFromStorage("LibStoryURL"+obj.dataset.libepubid), await Library.LibGetFromStorage("LibFilename"+obj.dataset.libepubid), obj.dataset.libepubid);
        } catch {
            ErrorLog.showErrorMessage(chrome.i18n.getMessage("errorEditMetadata"));
            return;
        }
    }
    
    static async LibGetMetadata(libepubid) {
        let LibMetadata = [];
        try{
            let EpubReader = await new zip.Data64URIReader(await Library.LibGetFromStorage("LibEpub"+libepubid))
            let EpubZip = new zip.ZipReader(EpubReader, {useWebWorkers: false});
            let EpubContent =  await EpubZip.getEntries();
            let opfFile = await EpubContent.filter(a => a.filename == "OEBPS/content.opf")[0].getData(new zip.TextWriter());
            
            let LibMetadataTags = ["dc:title", "dc:creator", "dc:language", "dc:subject", "dc:description"];
            let opfFileMatch;
            LibMetadataTags.forEach((element, index) => {
                LibMetadata[index] = "";
                if (( opfFileMatch = opfFile.match(new RegExp("<"+element+".*?>.*?</"+element+">", "gs"))) != null) {
                    LibMetadata[index] = opfFileMatch[0].replace(new RegExp("<"+element+".*?>"),"").replace(new RegExp("</"+element+">"),"");
                }
            });
            return LibMetadata;
        }catch {
            return LibMetadata;
        }
    }

    static LibShowLoadingText(){
        let LibRenderResult = document.getElementById("LibRenderResult");
        let LibRenderString = "";
        LibRenderString += "<div class='LibDivRenderWraper'>";
        LibRenderString += "<div class='warning'>";
        LibRenderString += document.getElementById("LibTemplateWarningInProgress").innerHTML;
        LibRenderString += "</div>";
        LibRenderString += "</div>";
        Library.AppendHtmlInDiv(LibRenderString, LibRenderResult, "LibDivRenderWraper");
    }

    static async LibHandelUpdate(objbtn, Blobdata, StoryURL, Filename, Id, NewChapterCount){
        Library.LibShowLoadingText();
        Library.LibFileReaderAddListeners();
        if (objbtn != -1) {
            Blobdata = objbtn.files[0];
            Filename = Blobdata.name.replace(".epub", "");
        }
        if (NewChapterCount == null) {
            NewChapterCount = 0;
        }
        LibFileReader.LibStorageValueURL = StoryURL;
        LibFileReader.LibStorageValueFilename = Filename;
        LibFileReader.LibStorageValueId = Id;
        LibFileReader.NewChapterCount = NewChapterCount;
        LibFileReader.readAsDataURL(Blobdata);
    }

    static async LibFileReaderload(){
        if (-1 == LibFileReader.LibStorageValueId) {
            let CurrentLibKeys = await Library.LibGetAllLibStorageKeys("LibEpub");
            let HighestLibEpub = 0;
            CurrentLibKeys.forEach(element => {
                element = element.replace("LibEpub","");
                if (parseInt(element)>=HighestLibEpub) {
                    HighestLibEpub = parseInt(element)+1; 
                }
            });
            LibFileReader.LibStorageValueId = HighestLibEpub;
            if (LibFileReader.LibStorageValueURL == "") {
                LibFileReader.LibStorageValueURL = await Library.LibGetSourceURL(LibFileReader.result);
            }
        }
        let StorageNewChapterCount = await Library.LibGetFromStorage("LibNewChapterCount" + LibFileReader.LibStorageValueId);
        let NewChapterCount = LibFileReader.NewChapterCount + parseInt(StorageNewChapterCount || "0");
        //Catch Firefox upload wrong Content-Type
        let result = LibFileReader.result;
        if (result.startsWith("data:application/octet-stream;base64,")) {
            let regex = new RegExp("^data:application/octet-stream;base64,");
            result = result.replace(regex, "data:application/epub+zip;base64,");
        }
        chrome.storage.local.set({
            ["LibEpub" + LibFileReader.LibStorageValueId]: result,
            ["LibStoryURL" + LibFileReader.LibStorageValueId]: LibFileReader.LibStorageValueURL,
            ["LibFilename" + LibFileReader.LibStorageValueId]: LibFileReader.LibStorageValueFilename,
            ["LibNewChapterCount" + LibFileReader.LibStorageValueId]: NewChapterCount
        }, async function() {
            await Library.LibSaveCoverImgInStorage(LibFileReader.LibStorageValueId);
            await Library.LibCreateStorageIDs(parseInt(LibFileReader.LibStorageValueId));
            Library.LibRenderSavedEpubs();
        });
    }
    
    static async LibGetSourceURL(EpubAsDataURL) {
        try{
            let EpubReader = await new zip.Data64URIReader(EpubAsDataURL)
            let EpubZip = new zip.ZipReader(EpubReader, {useWebWorkers: false});
            let EpubContent =  await EpubZip.getEntries();
            let opfFile = await EpubContent.filter(a => a.filename == "OEBPS/content.opf")[0].getData(new zip.TextWriter());
            return (opfFile.match(/<dc:identifier id="BookId" opf:scheme="URI">.+?<\/dc:identifier>/)[0].replace(/<dc:identifier id="BookId" opf:scheme="URI">/,"").replace(/<\/dc:identifier>/,""));
        }catch {
            return "Paste URL here!";
        }
    }

    static async LibConvertDataUrlToBlob(DataUrl) {
        let retblob;
        try {
            var dataString = DataUrl.slice(("data:application/epub+zip;base64,").length);
            var byteString = atob(dataString);
            var array = [];
            for (var i = 0; i < byteString.length; i++) {
                array.push(byteString.charCodeAt(i));
            }
            retblob = new Blob([new Uint8Array(array)], { type: "application/epub+zip" });
        } catch {
            //In case the Epub is too big atob() fails and this messy method works with bigger files.
            let Base64EpubReader = await new zip.Data64URIReader(DataUrl);
            let Base64EpubZip = new zip.ZipReader(Base64EpubReader, {useWebWorkers: false});
            
            let Base64EpubContent = await Base64EpubZip.getEntries();
            Base64EpubContent = Base64EpubContent.filter(a => a.directory == false);

            let BlobEpubWriter = new zip.BlobWriter("application/epub+zip");
            let BlobEpubZip = new zip.ZipWriter(BlobEpubWriter,{useWebWorkers: false,compressionMethod: 8});
            //Copy Base64Epub in BlobEpub
            for (let element of Base64EpubContent){
                if (element.filename == "mimetype") {
                    BlobEpubZip.add(element.filename, new zip.TextReader(await element.getData(new zip.TextWriter())), {compressionMethod: 0});
                    continue;
                }
                BlobEpubZip.add(element.filename, new zip.BlobReader(await element.getData(new zip.BlobWriter())));
            }
            retblob = await BlobEpubZip.close();
        }
        return retblob;
    };

    static LibFileReaderAddListeners(){
        LibFileReader.removeEventListener("load", Library.LibFileReaderloadImport);
        LibFileReader.removeEventListener("error", function(event){Library.LibFileReadererror(event)});
        LibFileReader.removeEventListener("abort", function(event){Library.LibFileReaderabort(event)});
        LibFileReader.addEventListener("load", Library.LibFileReaderload);
        LibFileReader.addEventListener("error", function(event){Library.LibFileReadererror(event)});
        LibFileReader.addEventListener("abort", function(event){Library.LibFileReaderabort(event)});
    }

    static LibFileReadererror(event){ErrorLog.showErrorMessage(event);}
    static LibFileReaderabort(event){ErrorLog.showErrorMessage(event);}
    
    static async LibDeleteEpub(objbtn){
        await Library.LibRemoveStorageIDs(objbtn.dataset.libepubid);
        let LibRemove = ["LibEpub" + objbtn.dataset.libepubid, "LibStoryURL" + objbtn.dataset.libepubid, "LibFilename" + objbtn.dataset.libepubid, "LibCover" + objbtn.dataset.libepubid, "LibNewChapterCount" + objbtn.dataset.libepubid];
        Library.userPreferences.readingList.tryDeleteEpubAndSave(document.getElementById("LibStoryURL" + objbtn.dataset.libepubid).value);
        chrome.storage.local.remove(LibRemove);
        Library.LibRenderSavedEpubs();
    }

    static async LibUpdateNewChapter(objbtn){
        let LibGetURL = ["LibStoryURL" + objbtn.dataset.libepubid];
        Library.LibClearFields();
        let obj = {};
        obj.dataset = {};
        obj.dataset.libclick = "yes";
        document.getElementById("startingUrlInput").value = await Library.LibGetFromStorage(LibGetURL);
        await main.onLoadAndAnalyseButtonClick.call(obj);
        if (document.getElementById("includeInReadingListCheckbox").checked != true) {
            document.getElementById("includeInReadingListCheckbox").click();
        }
        await main.fetchContentAndPackEpub.call(obj);
    }

    static LibSearchNewChapter(objbtn){
        let LibGetURL = ["LibStoryURL" + objbtn.dataset.libepubid];
        chrome.storage.local.get(LibGetURL, function(items) {
            Library.LibClearFields();
            document.getElementById("startingUrlInput").value = items[LibGetURL];
            //document.getElementById("libinvisbutton").click();
            // load page via XmlHTTPRequest
            main.onLoadAndAnalyseButtonClick().then(function() {
                if (document.getElementById("includeInReadingListCheckbox").checked != true) {
                    document.getElementById("includeInReadingListCheckbox").click();
                }
            },function(e) {
                ErrorLog.showErrorMessage(e);
            });
        });
    }

    static LibDownload(objbtn){
        let LibGetFileAndName = ["LibEpub" + objbtn.dataset.libepubid, "LibFilename" + objbtn.dataset.libepubid];
        chrome.storage.local.get(LibGetFileAndName, async function(items) {
            let userPreferences = UserPreferences.readFromLocalStorage();
            let overwriteExisting = userPreferences.overwriteExistingEpub.value;
            let backgroundDownload = userPreferences.noDownloadPopup.value;
            let LibRemove = ["LibNewChapterCount" + objbtn.dataset.libepubid];
            chrome.storage.local.remove(LibRemove);
            document.getElementById("LibNewChapterCount"+objbtn.dataset.libepubid).innerHTML = "";
            let blobdata = await Library.LibConvertDataUrlToBlob(items["LibEpub" + objbtn.dataset.libepubid]);
            return Download.save(blobdata, items["LibFilename" + objbtn.dataset.libepubid] + ".epub", overwriteExisting, backgroundDownload);
        });
    }

    static LibClearFields(){
        let chapterUrlsUI = new ChapterUrlsUI();
        chapterUrlsUI.populateChapterUrlsTable([]);
        let ElementsToClear = ["titleInput", "authorInput", "languageInput", "fileNameInput", "coverImageUrlInput", "subjectInput", "descriptionInput"];
        for (const element of ElementsToClear) {
            document.getElementById(element).value = "";
        }
        document.getElementById("sampleCoverImg").src = "";
    }
    
    static async Libupdateall(){
        if (document.getElementById("LibDownloadEpubAfterUpdateCheckbox").checked == true) {
            document.getElementById("includeInReadingListCheckbox").click();
        }
        let LibArray = await Library.LibGetFromStorage("LibArray");
        ErrorLog.SuppressErrorLog =  true;
        for (let i = 0; i < LibArray.length; i++) {
            Library.LibClearFields();
            let obj = {};
            obj.dataset = {};
            obj.dataset.libclick = "yes";
            obj.dataset.libsuppressErrorLog = true;
            document.getElementById("startingUrlInput").value = await Library.LibGetFromStorage("LibStoryURL" + LibArray[i]);
            await main.onLoadAndAnalyseButtonClick.call(obj);
            if (document.getElementById("includeInReadingListCheckbox").checked != true) {
                document.getElementById("includeInReadingListCheckbox").click();
            }
            await main.fetchContentAndPackEpub.call(obj);
        }
        ErrorLog.SuppressErrorLog =  false;
    }
    
    static getURLsFromList() {
        let inputvalue = document.getElementById("LibAddListToLibraryInput").value;
        let lines = inputvalue.split("\n");
        lines = lines.filter(a => a.trim() != "").map(a => a.trim()).filter(a => URL.canParse(a));
        return lines;
    }
    
    static async LibAddListToLibrary(){
        if (document.getElementById("LibDownloadEpubAfterUpdateCheckbox").checked == true) {
            document.getElementById("includeInReadingListCheckbox").click();
        }
        let links = Library.getURLsFromList();
        ErrorLog.SuppressErrorLog =  true;
        for (let i = 0; i < links.length; i++) {
            Library.LibClearFields();
            let obj = {};
            obj.dataset = {};
            obj.dataset.libclick = "yes";
            obj.dataset.libsuppressErrorLog = true;
            document.getElementById("startingUrlInput").value = links[i];
            await main.onLoadAndAnalyseButtonClick.call(obj);
            if (document.getElementById("includeInReadingListCheckbox").checked != true) {
                document.getElementById("includeInReadingListCheckbox").click();
            }
            await main.fetchContentAndPackEpub.call(obj);
        }
        ErrorLog.SuppressErrorLog =  false;
    }
    
    static Libexportall(){
        Library.LibShowLoadingText();
        chrome.storage.local.get(null, async function(items) {
            let CurrentLibKeys = items["LibArray"];
            let storyurls = [];
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                storyurls[i] = items["LibStoryURL" + CurrentLibKeys[i]];
            }
            let readingList = new ReadingList();
            readingList.readFromLocalStorage();
            
            let fileReadingList = {};
            fileReadingList.ReadingList = JSON.parse(readingList.toJson());
            fileReadingList.ReadingList.epubs = fileReadingList.ReadingList.epubs.filter(a => storyurls.includes(a.toc));
            
            let zipFileWriter = new zip.BlobWriter("application/zip");
            let zipWriter = new zip.ZipWriter(zipFileWriter,{useWebWorkers: false,compressionMethod: 8});;
            //in case for future changes to differntiate between different export versions
            zipWriter.add("LibraryVersion.txt", new zip.TextReader("2"));
            zipWriter.add("LibraryCountEntries.txt", new zip.TextReader(CurrentLibKeys.length));

            for (let i = 0; i < CurrentLibKeys.length; i++) {
                zipWriter.add("Library/"+i+"/LibCover", new zip.TextReader(items["LibCover" + CurrentLibKeys[i]]));
                zipWriter.add("Library/"+i+"/LibEpub", new zip.TextReader(items["LibEpub" + CurrentLibKeys[i]]));
                zipWriter.add("Library/"+i+"/LibFilename", new zip.TextReader(items["LibFilename" + CurrentLibKeys[i]]));
                zipWriter.add("Library/"+i+"/LibStoryURL", new zip.TextReader(items["LibStoryURL" + CurrentLibKeys[i]]));
                zipWriter.add("Library/"+i+"/LibNewChapterCount", new zip.TextReader(items["LibNewChapterCount"+CurrentLibKeys[i]] ?? "0"));
            }
            zipWriter.add("ReadingList.json", new zip.TextReader(JSON.stringify(fileReadingList)));
            Download.save(await zipWriter.close(), "Libraryexport.zip").catch (err => ErrorLog.showErrorMessage(err));
            Library.LibRenderSavedEpubs();
        });
    }

    static async LibHandelImport(objbtn){
        Library.LibShowLoadingText();
        Library.LibFileReaderAddListenersImport();
        let Blobdata = objbtn.files[0];
        LibFileReader.name = objbtn.files[0].name;
        let regex = new RegExp("zip$");
        if (!regex.test(LibFileReader.name)) {
            LibFileReader.readAsText(Blobdata);
        } else {
            LibFileReader.readAsArrayBuffer(Blobdata);
        }
    }

    static LibFileReaderAddListenersImport(){
        LibFileReader.removeEventListener("load", Library.LibFileReaderload);
        LibFileReader.removeEventListener("error", function(event){Library.LibFileReadererror(event)});
        LibFileReader.removeEventListener("abort", function(event){Library.LibFileReaderabort(event)});
        LibFileReader.addEventListener("load", Library.LibFileReaderloadImport);
        LibFileReader.addEventListener("error", function(event){Library.LibFileReadererror(event)});
        LibFileReader.addEventListener("abort", function(event){Library.LibFileReaderabort(event)});
    }

    static async LibFileReaderloadImport(){
        let regex = new RegExp("zip$");
        if (!regex.test(LibFileReader.name)) {
            let json = JSON.parse(LibFileReader.result);
            let CurrentLibKeys = await Library.LibGetAllLibStorageKeys("LibEpub");
            let HighestLibEpub = 0;
            CurrentLibKeys.forEach(element => {
                element = element.replace("LibEpub","");
                if (parseInt(element)>=HighestLibEpub) {
                    HighestLibEpub = parseInt(element)+1; 
                }
            });
            for (let i = 0; i < json.Library.length; i++) {
                chrome.storage.local.set({
                    ["LibEpub" + HighestLibEpub]: json.Library[i].LibEpub,
                    ["LibStoryURL" + HighestLibEpub]: json.Library[i].LibStoryURL,
                    ["LibCover" + HighestLibEpub]: json.Library[i].LibCover,
                    ["LibFilename" + HighestLibEpub]: json.Library[i].LibFilename
                });
                await Library.LibCreateStorageIDs(HighestLibEpub);
                HighestLibEpub++;
            }
            Library.userPreferences.loadReadingListFromJson(json);
            Library.LibRenderSavedEpubs();
        } else {
            let CurrentLibKeys = await Library.LibGetAllLibStorageKeys("LibEpub");
            let HighestLibEpub = 0;
            CurrentLibKeys.forEach(element => {
                element = element.replace("LibEpub","");
                if (parseInt(element)>=HighestLibEpub) {
                    HighestLibEpub = parseInt(element)+1; 
                }
            });
            let blobfile = new Blob([LibFileReader.result]);
            let zipFileReader = new zip.BlobReader(blobfile);
            let zipReader = new zip.ZipReader(zipFileReader, {useWebWorkers: false});
            let entries = await zipReader.getEntries();
            //check export logic version
            let LibraryVersion = await (await entries.filter((a) => a.filename == "LibraryVersion.txt")[0]).getData(new zip.TextWriter());
            
            if (LibraryVersion == null) {
                ErrorLog.showErrorMessage("Wrong export version");
                return;
            }
            let LibCountEntries = await (await entries.filter((a) => a.filename == "LibraryCountEntries.txt")[0])?.getData(new zip.TextWriter());
            for (let i = 0; i < LibCountEntries; i++) {
                chrome.storage.local.set({
                    ["LibCover" + HighestLibEpub]: await (await entries.filter((a) => a.filename == "Library/"+i+"/LibCover")[0]).getData(new zip.TextWriter()),
                    ["LibEpub" + HighestLibEpub]: await (await entries.filter((a) => a.filename == "Library/"+i+"/LibEpub")[0]).getData(new zip.TextWriter()),
                    ["LibFilename" + HighestLibEpub]: await (await entries.filter((a) => a.filename == "Library/"+i+"/LibFilename")[0]).getData(new zip.TextWriter()),
                    ["LibStoryURL" + HighestLibEpub]: await (await entries.filter((a) => a.filename == "Library/"+i+"/LibStoryURL")[0]).getData(new zip.TextWriter()),
                    ["LibNewChapterCount" + HighestLibEpub]: await (await entries.filter((a) => a.filename == "Library/"+i+"/LibNewChapterCount")[0])?.getData(new zip.TextWriter())??"0"
                });
                await Library.LibCreateStorageIDs(HighestLibEpub);
                HighestLibEpub++;
            }
            Library.userPreferences.loadReadingListFromJson(JSON.parse( await (await entries.filter((a) => a.filename == "ReadingList.json")[0]).getData(new zip.TextWriter())));
            Library.LibRenderSavedEpubs();
        }
    }

    static LibSaveTextURLChange(obj){
        let LibGetFileAndName = obj.id;
        chrome.storage.local.set({
            [LibGetFileAndName]: obj.value
        });
    }

    static LibShowTextURLWarning(obj){
        let LibTemplateWarningURLChange = document.getElementById("LibTemplateWarningURLChange").innerHTML;
        let LibWarningElement = document.getElementById("LibURLWarning"+obj.dataset.libepubid);
        LibWarningElement.innerHTML = "<tr><td style='color:yellow;'></td></tr>";
        LibWarningElement.firstChild.firstChild.textContent = LibTemplateWarningURLChange;
    }

    static LibHideTextURLWarning(obj){
        document.getElementById("LibURLWarning"+obj.dataset.libepubid).innerHTML = "<tr><td></td></tr>";
    }

    static async LibGetAllLibStorageKeys(Substring, AllStorageKeysList){
        return new Promise((resolve) => {
            if (AllStorageKeysList == undefined) {
                chrome.storage.local.get(null, function(items){
                    let AllStorageKeys = Object.keys(items);
                    let AllLibStorageKeys = [];
                    for (let i = 0, end = AllStorageKeys.length; i < end; i++) {
                        if(AllStorageKeys[i].includes(Substring)){
                            AllLibStorageKeys.push(AllStorageKeys[i]);
                        }   
                    }
                    resolve(AllLibStorageKeys);
                });
            } else {
                let AllLibStorageKeys = [];
                for (let i = 0, end = AllStorageKeysList.length; i < end; i++) {
                    if(AllStorageKeysList[i].includes(Substring)){
                        AllLibStorageKeys.push(AllStorageKeysList[i]);
                    }   
                }
                resolve(AllLibStorageKeys);
            }
        });
    }

    static async LibGetFromStorageArray(Keys){
        return new Promise((resolve) => {
            chrome.storage.local.get(Keys, function(items){
                resolve(items);
            });
        });
    }

    static async LibGetFromStorage(Key){
        return new Promise((resolve) => {
            chrome.storage.local.get(Key, function(item){
                resolve(item[Key]);
            });
        });
    }

    static AppendHtmlInDiv(HTMLstring, DivObjectInject, DivClassWraper ){
        let parser = new DOMParser();
        let parsed = parser.parseFromString(HTMLstring, "text/html");
        let tags = parsed.getElementsByClassName(DivClassWraper);
        DivObjectInject.innerHTML = "";
        for (let  tag of tags) {
            DivObjectInject.appendChild(tag);
        }
    }
}