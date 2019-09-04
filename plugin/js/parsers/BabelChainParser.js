"use strict";

parserFactory.register("novel.babelchain.org", () => new BabelChainParser());
parserFactory.register("babelnovel.com", () => new BabelChainParser());

class BabelChainParser extends Parser{
    getBookEntity(dom) {
        let __STATE__ = decodeURIComponent(dom.body.innerHTML.match(/window\.__STATE__\s=\s"([^"]+)"/)[1]);
        let state = JSON.parse(__STATE__);

        console.log(state);

        return state.bookDetailStore.bookEntity;
    }

    getChapterUrls(dom) {
        let bookEntity = this.getBookEntity(dom);
        let chaptersUrl = `https://babelnovel.com/api/books/${bookEntity.id}/chapters?pageSize=50000&page=0`;

        return fetch(chaptersUrl).then((response) => {
            return response.json().then((result) => {
                return result.data.map((chapter) => {
                    return {
                        sourceUrl: `https://babelnovel.com/books/${bookEntity.canonicalName}/chapters/${chapter.canonicalName}`,
                        title: chapter.name
                    };
                });
            });
        }).catch((e) => {
            return [];
        });
    }
    extractTitleImpl(dom) {
        return this.getBookEntity(dom).name || null;
    }

    findContent(dom) {
        return dom;
    }

    findCoverImageUrl(dom) {
        return this.getBookEntity(dom).cover || null;
    }

    getInformationEpubItemChildNodes(dom) {
        let synopsis = '';

        synopsis += this.getBookEntity(dom).subTitle || '';
        synopsis += "\n";
        synopsis += this.getBookEntity(dom).synopsis || '';

        let p = document.createElement('p');
        p.innerHTML = synopsis;

        return [p];
    }

    fetchChapter(url) {
        return fetch(url.replace('/books/', '/api//books/')).then((response) => {
            return response.json().then((result) => {
                let div = document.createElement('div');

                div.cssText = 'line-height: 1.5em;text-indent: 1.5em;word-spacing: .12em;letter-spacing: .01em; padding: 0 5%;';

                div.innerHTML = result.data.content
                .replace('<blockquote>', '<p>')
                .replace('</blockquote>', '</p>')
                .replace(/\n{2}/g, '</p><p>');

                return div;
            });
        });
    }
}
