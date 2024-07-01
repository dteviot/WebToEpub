/*
  Libraryclass to save Epubs from Storys which are ongoing
*/
"use strict";

var LibFileReader = new FileReader();

class Library {
    constructor() {
    }
    
    LibAddToLibrary(AddEpub, fileName, overwriteExisting, backgroundDownload){
        if (document.getElementById("includeInReadingListCheckbox").checked != true) {
            document.getElementById("includeInReadingListCheckbox").click();
        }
        chrome.storage.local.get(null, async function(items) {
            let CurrentLibStoryURLKeys = await Library.LibGetAllLibStorageKeys("LibStoryURL");
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

            let PreviousEpub = Library.LibConvertDataUrlToBlob(items["LibEpub" + LibidURL]);
            let MergedEpub = await Library.LibMergeEpub(PreviousEpub, AddEpub, LibidURL);
            if (document.getElementById("LibDownloadEpubAfterUpdateCheckbox").checked) {
                return Download.save(MergedEpub, fileName, overwriteExisting, backgroundDownload);
            }else{
                return new Promise((resolve) => {resolve();});
            }
        });
    }
    
    onUserPreferencesUpdate(userPreferences) {
        Library.userPreferences = userPreferences;
    }

    static async LibMergeEpub(PreviousEpub, AddEpub, LibidURL){
        return new Promise((resolve, reject) => {
            Library.LibShowLoadingText();
            let Prevjszip = new JSZip();
            let Addjszip = new JSZip();
            Prevjszip.loadAsync(PreviousEpub).then(async function(PreviousEpubzip) {
                let PreviousEpubImageFolder = PreviousEpubzip.folder("OEBPS/Images");
                let PreviousEpubTextFolder = PreviousEpubzip.folder("OEBPS/Text");
                let ImagenumberPreviousEpub = 0;
                let TextnumberPreviousEpub = 0;
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
                Addjszip.loadAsync(AddEpub).then(async function(AddEpubzip) {
                    let ToMergeEpubzip = new JSZip();
                    let AddEpubImageFolder = AddEpubzip.folder("OEBPS/Images");
                    let AddEpubTextFolder = AddEpubzip.folder("OEBPS/Text");
                    let ImagenumberAddEpub = 1;
                    let TextnumberAddEpub = 0;
                    if (AddEpubTextFolder.file("0000_Information.xhtml") != null) {
                        TextnumberAddEpub++;
                    }
                    let AddEpubTextFile;
                    let AddEpubImageFile;
                    let PreviousEpubContentText = await PreviousEpubzip.file("OEBPS/content.opf").async("string");
                    let PreviousEpubTocText = await PreviousEpubzip.file("OEBPS/toc.ncx").async("string");
                    let PreviousEpubTocEpub3Text =  (await PreviousEpubzip.file("OEBPS/toc.xhtml"))?.async("string");
                    let AddEpubContentText = await AddEpubzip.file("OEBPS/content.opf").async("string");
                    let AddEpubTocText = await AddEpubzip.file("OEBPS/toc.ncx").async("string");
                    let regex1, regex2, regex3, regex4, string1, string2, string3, string4;
                    // eslint-disable-next-line
                    while ((AddEpubTextFile = AddEpubTextFolder.file(new RegExp(("0000"+TextnumberAddEpub).slice(-4)+".+\.xhtml"))).length != 0) {

                        AddEpubTextFile = AddEpubTextFile[0];
                        let AddEpubTextFilestring = await AddEpubTextFile.async("string");
                        // eslint-disable-next-line
                        while ((AddEpubImageFile = AddEpubImageFolder.file(new RegExp(("0000"+ImagenumberAddEpub).slice(-4)+".+\..+"))).length != 0) {
                            AddEpubImageFile = AddEpubImageFile[0];
                            if (AddEpubTextFilestring.search(AddEpubImageFile.name.replace("OEBPS/", ""))==-1) {
                                break;
                            }
                            // eslint-disable-next-line
                            ToMergeEpubzip.file(AddEpubImageFile.name.replace(("0000"+ImagenumberAddEpub).slice(-4),("0000"+ImagenumberPreviousEpub).slice(-4)), await AddEpubImageFile.async("base64"), {base64: true, compression: "DEFLATE"});
                            AddEpubTextFilestring = AddEpubTextFilestring.replace(AddEpubImageFile.name.replace("OEBPS", ""), AddEpubImageFile.name.replace("OEBPS", "").replace(("/Images/0000"+ImagenumberAddEpub).slice(-4), ("/Images/0000"+ImagenumberPreviousEpub).slice(-4)));
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
                        let newChaptername = AddEpubTextFile.name.replace(("0000"+TextnumberAddEpub).slice(-4),("0000"+TextnumberPreviousEpub).slice(-4));
                        ToMergeEpubzip.file(newChaptername, AddEpubTextFilestring, { compression: "DEFLATE" });
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
                        if (PreviousEpubTocEpub3Text != null) {
                            string1 = "</ol></nav>";
                            regex2 = new RegExp(".+<text>");
                            regex3 = new RegExp("</text>.+");
                            string2 = "<li><a href=\""+ newChaptername.slice(6) + "\">"+AddEpubTocText.match(regex1)[0].replace(regex2, "").replace(regex3, "")+"</a></li>";
                            PreviousEpubTocEpub3Text = PreviousEpubTocEpub3Text.replace(string1, string2+string1);
                        }
                        PreviousEpubzip = await PreviousEpubzip.loadAsync(await ToMergeEpubzip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: "application/epub+zip",}));
                        ToMergeEpubzip = new JSZip();
                        TextnumberPreviousEpub++;
                        TextnumberAddEpub++;
                    }
                    let ToMergeEpubzipgenerated = await ToMergeEpubzip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: "application/epub+zip",});
                    PreviousEpubzip.loadAsync(ToMergeEpubzipgenerated).then(async function (zip) {
                        zip.remove("OEBPS/content.opf");
                        zip.file("OEBPS/content.opf", PreviousEpubContentText, { compression: "DEFLATE" });
                        zip.remove("OEBPS/toc.ncx");
                        zip.file("OEBPS/toc.ncx", PreviousEpubTocText, { compression: "DEFLATE" });
                        if (PreviousEpubTocEpub3Text != null) {
                            zip.remove("OEBPS/toc.xhtml");
                            zip.file("OEBPS/toc.xhtml", PreviousEpubTocEpub3Text, { compression: "DEFLATE" });
                        }
                        let content = await zip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: "application/epub+zip",});
                        Library.LibHandelUpdate(-1, content, await Library.LibGetFromStorage("LibStoryURL" + LibidURL), await Library.LibGetFromStorage("LibFilename" + LibidURL), LibidURL);
                        resolve(content);
                    }, function (e) {
                        reject(ErrorLog.showErrorMessage(e));
                    });
                }, function (e) {
                    reject(ErrorLog.showErrorMessage(e));
                });
            }, function (e) {
                reject(ErrorLog.showErrorMessage(e));
            });

        });
    }

    static LibManipulateContentFromTO(ContentFrom = "", ContentTo = "", regexFrom1 = "", stringTo1 = "", regexFrom2 = "", stringTo2 = "", regexFrom3 = "", stringTo3 = "", regexFrom4 = "", stringTo4 = ""){
        return ContentTo.replace(stringTo1, ContentFrom.match(regexFrom1)[0].replace(regexFrom2, stringTo2).replace(regexFrom3, stringTo3).replace(regexFrom4, stringTo4)+stringTo1);
    }

    static async LibSaveCoverImgInStorage(idfromepub) {
        return new Promise((resolve) => {
            chrome.storage.local.get("LibEpub" + idfromepub, async function(items, ) {
                JSZip.loadAsync(Library.LibConvertDataUrlToBlob(items["LibEpub" + idfromepub])).then(async function(zip) {
                    try{
                        let Coverxml = await zip.file("OEBPS/Text/Cover.xhtml").async("string");
                        let CoverimgPath = "OEBPS"+Coverxml.match(/"..\/Images\/000.+?"/)[0].replace(/"../,"").replace("\"","");
                        let Coverimage = zip.file(CoverimgPath);
                        Coverimage.async("base64").then(function(content) {
                            let CoverFiletype = Coverimage.name.split(".")[1];
                            if (CoverFiletype == "svg") {
                                CoverFiletype = "svg+xml";
                            }
                            let Cover = "data:image/"+CoverFiletype+";base64," + content;
                            chrome.storage.local.set({
                                ["LibCover" + idfromepub]: Cover
                            }, function() {
                                resolve();
                            });
                        },function(e) {
                            ErrorLog.showErrorMessage(e);
                            resolve();
                        });
                    }catch {
                        let no_cover_svg = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIxNjFweCIgaGVpZ2h0PSIxODFweCIgdmlld0JveD0iLTAuNSAtMC41IDE2MSAxODEiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48ZGVmcy8+PGc+PHJlY3QgeD0iMCIgeT0iMy4yNCIgd2lkdGg9IjE2MCIgaGVpZ2h0PSIxNzMuNTIiIGZpbGw9InJnYigyNTUsIDI1NSwgMjU1KSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz48cmVjdCB4PSI0Mi4wNyIgeT0iMzMuMjkiIHdpZHRoPSI3NS44NyIgaGVpZ2h0PSI3NS4xMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZS13aWR0aD0iNC41MSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxlbGxpcHNlIGN4PSI2Ni4xIiBjeT0iNTEuMzEiIHJ4PSI2LjAwOTM4OTY3MTM2MTUwMiIgcnk9IjYuMDA5Mzg5NjcxMzYxNTAyIiBmaWxsPSJub25lIiBzdHJva2U9InJnYigwLCAwLCAwKSIgc3Ryb2tlLXdpZHRoPSI0LjUxIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+PHBhdGggZD0iTSA0Mi4wNyA5MC4zOCBMIDU3LjA5IDcwLjg1IEwgNzIuMTEgOTcuODkgTCA5MS42NCA1Mi44MiBMIDExNy45MyAxMDAuODkiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2Utd2lkdGg9IjQuNTEiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9ImFsbCIvPjxnIGZpbGw9IiMwMDAwMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCxIZWx2ZXRpY2EiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjIyLjUzNTIxMTI2NzYwNTYzMnB4Ij48dGV4dCB4PSI3OS41IiB5PSIxNDUuNzQiPk5vIGltYWdlPC90ZXh0PjwvZz48ZyBmaWxsPSIjMDAwMDAwIiBmb250LWZhbWlseT0iQXJpYWwsSGVsdmV0aWNhIiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIyMi41MzUyMTEyNjc2MDU2MzJweCI+PHRleHQgeD0iNzkuNSIgeT0iMTYzLjk5Ij5hdmFpbGFibGU8L3RleHQ+PC9nPjwvZz48L3N2Zz4=";
                        chrome.storage.local.set({
                            ["LibCover" + idfromepub]: no_cover_svg
                        }, function() {
                            resolve();
                        });
                    }
                }, function (e) {
                    ErrorLog.showErrorMessage(e);
                    resolve();
                });
            });
        });
    }

    static Libdeleteall(){
        chrome.storage.local.clear();
        Library.LibRenderSavedEpubs();
    }

    static LibRenderSavedEpubs(){
        chrome.storage.local.get(null, async function(items) {
            let ShowAdvancedOptions = document.getElementById("LibShowAdvancedOptionsCheckbox").checked;
            let CurrentLibKeys = await Library.LibGetAllLibStorageKeys("LibEpub");
            let LibRenderResult = document.getElementById("LibRenderResult");
            let LibRenderString = "";
            let LibTemplateDeleteEpub = document.getElementById("LibTemplateDeleteEpub").innerHTML;
            let LibTemplateSearchNewChapter = document.getElementById("LibTemplateSearchNewChapter").innerHTML;
            let LibTemplateDownload = document.getElementById("LibTemplateDownload").innerHTML;
            let LibTemplateURL = document.getElementById("LibTemplateURL").innerHTML;
            let LibTemplateFilename = document.getElementById("LibTemplateFilename").innerHTML;
            let LibTemplateMergeUploadButton = "";
            let LibTemplateEditMetadataButton = "";

            LibRenderString += "<div class='LibDivRenderWraper'>";
            if (!util.isFirefox()) {
                let LibTemplateLibraryUses = document.getElementById("LibTemplateLibraryUses").innerHTML;
                LibRenderString += LibTemplateLibraryUses;
                LibRenderString += await Library.LibBytesInUse();
                LibRenderString += "<br>";
            }
            document.getElementById("LibDownloadEpubAfterUpdateRow").hidden = !ShowAdvancedOptions;
            if (ShowAdvancedOptions) {
                LibTemplateMergeUploadButton = document.getElementById("LibTemplateMergeUploadButton").innerHTML;
                LibTemplateEditMetadataButton = document.getElementById("LibTemplateEditMetadataButton").innerHTML;
                LibRenderString += "<button id='libdeleteall'>"+document.getElementById("LibTemplateClearLibrary").innerHTML+"</button>";
                LibRenderString += "<br>";
                LibRenderString += "<p>"+document.getElementById("LibTemplateUploadEpubFileLabel").innerHTML+"</p>";
                LibRenderString += "<label data-libbuttonid='LibUploadEpubButton' data-libepubid='' id='LibUploadEpubLabel' for='LibEpubNewUploadFile' style='cursor: pointer;'>";
                LibRenderString += "<button id='LibUploadEpubButton' style='pointer-events: none;'>"+document.getElementById("LibTemplateUploadEpubButton").innerHTML+"</button></label>";
                LibRenderString += "<input type='file' data-libepubid='LibEpubNew' id='LibEpubNewUploadFile' hidden>";
            }
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                CurrentLibKeys[i] = CurrentLibKeys[i].replace("LibEpub","");
                LibRenderString += "<br>";
                LibRenderString += "<table>";
                LibRenderString += "<tbody>";
                LibRenderString += "<tr>";
                LibRenderString += "<td style='height: 115.5px; width: 106.5px;' rowspan='4'>   <img class='LibCover' id='LibCover"+CurrentLibKeys[i]+"'></td>";
                LibRenderString += "<td colspan='2'>";
                LibRenderString += "<button data-libepubid="+CurrentLibKeys[i]+" id='LibDeleteEpub"+CurrentLibKeys[i]+"'>"+LibTemplateDeleteEpub+"</button>";
                LibRenderString += "<button data-libepubid="+CurrentLibKeys[i]+" id='LibSearchNewChapter"+CurrentLibKeys[i]+"'>"+LibTemplateSearchNewChapter+"</button>";
                LibRenderString += "<button data-libepubid="+CurrentLibKeys[i]+" id='LibDownload"+CurrentLibKeys[i]+"'>"+LibTemplateDownload+"</button>";
                if (ShowAdvancedOptions) {
                    LibRenderString += "</td>";
                    LibRenderString += "</tr>";
                    LibRenderString += "<tr>";
                    LibRenderString += "<td colspan='2'>";
                    LibRenderString += "<label id='LibMergeUploadLabel"+CurrentLibKeys[i]+"' data-libbuttonid='LibMergeUploadButton' data-libepubid="+CurrentLibKeys[i]+" for='LibMergeUpload"+CurrentLibKeys[i]+"' style='cursor: pointer;'>";
                    LibRenderString += "<button id='LibMergeUploadButton"+CurrentLibKeys[i]+"' style='pointer-events: none;'>"+LibTemplateMergeUploadButton+"</button></label>";
                    LibRenderString += "<input type='file' data-libepubid="+CurrentLibKeys[i]+" id='LibMergeUpload"+CurrentLibKeys[i]+"' hidden>";
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
                LibRenderString += "<input data-libepubid="+CurrentLibKeys[i]+" id='LibStoryURL"+CurrentLibKeys[i]+"' type='url' value='"+items["LibStoryURL"+CurrentLibKeys[i]]+"'>";
                LibRenderString += "</td></tr>";
                LibRenderString += "</tbody>";
                LibRenderString += "</table>";
                LibRenderString += "</td>";
                LibRenderString += "</tr>";
                LibRenderString += "<tr>";
                LibRenderString += "<td>"+LibTemplateFilename+"</td>";
                LibRenderString += "<td><input id='LibFilename"+CurrentLibKeys[i]+"' type='text' value='"+items["LibFilename"+CurrentLibKeys[i]]+"'></td>";
                LibRenderString += "</tr>";
                LibRenderString += "</tbody>";
                LibRenderString += "</table>";
                if (ShowAdvancedOptions) {
                    LibRenderString += "<div id='LibRenderMetadata"+CurrentLibKeys[i]+"'></div>";
                }
            }
            LibRenderString += "</div>";
            Library.AppendHtmlInDiv(LibRenderString, LibRenderResult, "LibDivRenderWraper");
            if (ShowAdvancedOptions) {
                document.getElementById("libdeleteall").addEventListener("click", function(){Library.Libdeleteall()});
                document.getElementById("LibUploadEpubLabel").addEventListener("mouseover", function(){Library.LibMouseoverButtonUpload(this)});
                document.getElementById("LibUploadEpubLabel").addEventListener("mouseout", function(){Library.LibMouseoutButtonUpload(this)});
                document.getElementById("LibEpubNewUploadFile").addEventListener("change", function(){Library.LibHandelUpdate(this, -1, "", "", -1)});
            }
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                document.getElementById("LibDeleteEpub"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibDeleteEpub(this)});
                document.getElementById("LibSearchNewChapter"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibSearchNewChapter(this)});
                document.getElementById("LibDownload"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibDownload(this)});
                document.getElementById("LibStoryURL"+CurrentLibKeys[i]).addEventListener("change", function(){Library.LibSaveTextURLChange(this)});
                document.getElementById("LibStoryURL"+CurrentLibKeys[i]).addEventListener("focusin", function(){Library.LibShowTextURLWarning(this)});
                document.getElementById("LibStoryURL"+CurrentLibKeys[i]).addEventListener("focusout", function(){Library.LibHideTextURLWarning(this)});
                document.getElementById("LibFilename"+CurrentLibKeys[i]).addEventListener("change", function(){Library.LibSaveTextURLChange(this)});
                if (ShowAdvancedOptions) {
                    document.getElementById("LibMergeUpload"+CurrentLibKeys[i]).addEventListener("change", function(){Library.LibMergeUpload(this)});
                    document.getElementById("LibMergeUploadLabel"+CurrentLibKeys[i]).addEventListener("mouseover", function(){Library.LibMouseoverButtonUpload(this)});
                    document.getElementById("LibMergeUploadLabel"+CurrentLibKeys[i]).addEventListener("mouseout", function(){Library.LibMouseoutButtonUpload(this)});
                    document.getElementById("LibEditMetadata"+CurrentLibKeys[i]).addEventListener("click", function(){Library.LibEditMetadata(this)});
                }
            }
            for (let i = 0; i < CurrentLibKeys.length; i++) {
                document.getElementById("LibCover"+CurrentLibKeys[i]).src = await items["LibCover" + CurrentLibKeys[i]];
            }
        });
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
        let PreviousEpub = Library.LibConvertDataUrlToBlob(await Library.LibGetFromStorage("LibEpub" + objbtn.dataset.libepubid));
        let AddEpub = objbtn.files[0];
        Library.LibMergeEpub(PreviousEpub, AddEpub, objbtn.dataset.libepubid);
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
    
    static async LibSaveMetadataChangeold(obj) {
        let LibSubjectInput = document.getElementById("LibSubjectInput"+obj.dataset.libepubid).value;
        let LibDescriptionInput = document.getElementById("LibDescriptionInput"+obj.dataset.libepubid).value;
        Library.LibShowLoadingText();
        let EpubAsBlob = Library.LibConvertDataUrlToBlob(await Library.LibGetFromStorage("LibEpub"+obj.dataset.libepubid));
        JSZip.loadAsync(EpubAsBlob).then(async function(zip) {
            try{
                let opfFile = await zip.file("OEBPS/content.opf").async("string");
                let regex1 = opfFile.match(new RegExp("<dc:description>.*?</dc:description>", "gs"));
                if ( regex1 == null) {
                    opfFile = opfFile.replace(new RegExp("</dc:date>"),"</dc:date><dc:description></dc:description>")
                }
                regex1 = opfFile.match(new RegExp("<dc:subject>.*?</dc:subject>", "gs"));
                if (regex1 == null) {
                    opfFile = opfFile.replace(new RegExp("</dc:date>"),"</dc:date><dc:subject></dc:subject>")
                }
                opfFile = opfFile.replace(new RegExp("<dc:subject>.*?</dc:subject>", "gs"), "<dc:subject>"+LibSubjectInput+"</dc:subject>");
                opfFile = opfFile.replace(new RegExp("<dc:description>.*?</dc:description>", "gs"), "<dc:description>"+LibDescriptionInput+"</dc:description>");
                zip.file("OEBPS/content.opf", opfFile, { compression: "DEFLATE" });
                let content = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip",});
                Library.LibHandelUpdate(-1, content, await Library.LibGetFromStorage("LibStoryURL"+obj.dataset.libepubid), await Library.LibGetFromStorage("LibFilename"+obj.dataset.libepubid), obj.dataset.libepubid);
            }catch {
            //
            }
        }, function (e) {
            ErrorLog.showErrorMessage(e);
        });
    }

    static async LibSaveMetadataChange(obj){
        let LibTitleInput = document.getElementById("LibTitleInput"+obj.dataset.libepubid).value;
        let LibAutorInput = document.getElementById("LibAutorInput"+obj.dataset.libepubid).value;
        let LibLanguageInput = document.getElementById("LibLanguageInput"+obj.dataset.libepubid).value;
        let LibSubjectInput = document.getElementById("LibSubjectInput"+obj.dataset.libepubid).value;
        let LibDescriptionInput = document.getElementById("LibDescriptionInput"+obj.dataset.libepubid).value;
        Library.LibShowLoadingText();
        let LibDateCreated = new EpubPacker().getDateForMetaData();
        let EpubAsBlob = Library.LibConvertDataUrlToBlob(await Library.LibGetFromStorage("LibEpub"+obj.dataset.libepubid));
        JSZip.loadAsync(EpubAsBlob).then(async function(zip) {
            try{
                let opfFile = await zip.file("OEBPS/content.opf").async("string");
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
                zip.file("OEBPS/content.opf", opfFile, { compression: "DEFLATE" });
                let content = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip",});
                Library.LibHandelUpdate(-1, content, await Library.LibGetFromStorage("LibStoryURL"+obj.dataset.libepubid), await Library.LibGetFromStorage("LibFilename"+obj.dataset.libepubid), obj.dataset.libepubid);
            }catch {
            //
            }
        }, function (e) {
            ErrorLog.showErrorMessage(e);
        });
    }
    
    static async LibGetMetadata(libepubid) {
        let EpubAsBlob = Library.LibConvertDataUrlToBlob(await Library.LibGetFromStorage("LibEpub"+libepubid));
        return new Promise((resolve) => {
            let LibMetadata = [];
            JSZip.loadAsync(EpubAsBlob).then(async function(zip) {
                let LibMetadataTags = ["dc:title", "dc:creator", "dc:language", "dc:subject", "dc:description"];
                let opfFile = await zip.file("OEBPS/content.opf").async("string");
                let opfFileMatch;
                LibMetadataTags.forEach((element, index) => {
                    LibMetadata[index] = "";
                    if (( opfFileMatch = opfFile.match(new RegExp("<"+element+".*?>.*?</"+element+">", "gs"))) != null) {
                        LibMetadata[index] = opfFileMatch[0].replace(new RegExp("<"+element+".*?>"),"").replace(new RegExp("</"+element+">"),"");
                    }
                });
                resolve(LibMetadata);
            }, function (e) {
                ErrorLog.showErrorMessage(e);
                resolve(LibMetadata);
            });
        });
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

    static async LibHandelUpdate(objbtn, Blobdata, StoryURL, Filename, Id){
        Library.LibShowLoadingText();
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
        chrome.storage.local.set({
            ["LibEpub" + LibFileReader.LibStorageValueId]: LibFileReader.result,
            ["LibStoryURL" + LibFileReader.LibStorageValueId]: LibFileReader.LibStorageValueURL,
            ["LibFilename" + LibFileReader.LibStorageValueId]: LibFileReader.LibStorageValueFilename
        }, async function() {
            await Library.LibSaveCoverImgInStorage(LibFileReader.LibStorageValueId);
            Library.LibRenderSavedEpubs();
        });
    }
    
    static async LibGetSourceURL(EpubAsDataURL) {
        return new Promise((resolve) => {
            JSZip.loadAsync(Library.LibConvertDataUrlToBlob(EpubAsDataURL)).then(async function(zip) {
                try{
                    let opfFile = await zip.file("OEBPS/content.opf").async("string");
                    resolve(opfFile.match(/<dc:identifier id="BookId" opf:scheme="URI">.+?<\/dc:identifier>/)[0].replace(/<dc:identifier id="BookId" opf:scheme="URI">/,"").replace(/<\/dc:identifier>/,""));
                }catch {
                    resolve("Paste URL here!");
                }
            }, function (e) {
                ErrorLog.showErrorMessage(e);
                resolve("Paste URL here!");
            });
        });
    }

    static LibConvertDataUrlToBlob(DataUrl) {
        var dataString = DataUrl.slice(("data:application/epub+zip;base64,").length);
        var byteString = atob(dataString);
        var array = [];
        for (var i = 0; i < byteString.length; i++) {
            array.push(byteString.charCodeAt(i));
        }
        return new Blob([new Uint8Array(array)], { type: "application/epub+zip" });
    };

    static LibFileReaderAddListeners(LibFileReader){
        LibFileReader.addEventListener("load", function(){Library.LibFileReaderload()});
        LibFileReader.addEventListener("error", function(event){Library.LibFileReadererror(event)});
        LibFileReader.addEventListener("abort", function(event){Library.LibFileReaderabort(event)});
    }

    static LibFileReadererror(event){ErrorLog.showErrorMessage(event);}
    static LibFileReaderabort(event){ErrorLog.showErrorMessage(event);}
    
    static LibDeleteEpub(objbtn){
        let LibRemove = ["LibEpub" + objbtn.dataset.libepubid, "LibStoryURL" + objbtn.dataset.libepubid, "LibFilename" + objbtn.dataset.libepubid, "LibCover" + objbtn.dataset.libepubid];
        Library.userPreferences.readingList.tryDeleteEpubAndSave(document.getElementById("LibStoryURL" + objbtn.dataset.libepubid).value);
        chrome.storage.local.remove(LibRemove);
        Library.LibRenderSavedEpubs();
    }

    static LibSearchNewChapter(objbtn){
        let LibGetURL = ["LibStoryURL" + objbtn.dataset.libepubid];
        chrome.storage.local.get(LibGetURL, function(items) {
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
            let blobdata = Library.LibConvertDataUrlToBlob(items["LibEpub" + objbtn.dataset.libepubid]);
            return Download.save(blobdata , items["LibFilename" + objbtn.dataset.libepubid] + ".epub", overwriteExisting, backgroundDownload);
        });
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

    static async LibGetAllLibStorageKeys(Substring){
        return new Promise((resolve) => {
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