"use strict";

module("WtrlabParser");

QUnit.test("extractAuthor - standard two-link author block", function (assert) {
    let html = `
    <div>
        <div class="grid grid-cols-[108px_1fr] items-center gap-x-2.5 px-3.5 py-[9px] border-b border-border last:border-b-0 even:bg-black/[0.016] dark:even:bg-white/[0.022] max-[400px]:grid-cols-1 max-[400px]:gap-0.5 max-[400px]:px-3 max-[400px]:py-2">
            <span class="text-[10.5px] font-bold uppercase tracking-[0.07em] whitespace-nowrap pt-px leading-6 text-muted-foreground">Author</span>
            <div class="text-[13px] leading-relaxed wrap-break-word [&amp;_a]:no-underline [&amp;_a]:font-semibold [&amp;_a:hover]:text-primary flex flex-col gap-px">
                <a href="/en/author/%E9%81%93%E5%B0%8F%E6%98%93">道小易</a>
                <a class="text-xs opacity-65" href="/en/author/%E9%81%93%E5%B0%8F%E6%98%93">Dao Xiao Yi</a>
            </div>
        </div>
    </div>
    `;
    let dom = new DOMParser().parseFromString(html, "text/html");
    let parser = new WtrlabParser();
    let author = parser.extractAuthor(dom);
    assert.equal(author, "道小易 - Dao Xiao Yi");
});

QUnit.test("extractAuthor - single link author block", function (assert) {
    let html = `
    <div>
        <div>
            <span>Author</span>
            <div>
                <a href="/en/author/%E9%81%93%E5%B0%8F%E6%98%93">道小易</a>
            </div>
        </div>
    </div>
    `;
    let dom = new DOMParser().parseFromString(html, "text/html");
    let parser = new WtrlabParser();
    let author = parser.extractAuthor(dom);
    assert.equal(author, "道小易");
});

QUnit.test("extractAuthor - fallback to unknown", function (assert) {
    let html = `
    <div>
        <div>
            <span>Other Field</span>
            <div>
                <a>Someone</a>
            </div>
        </div>
    </div>
    `;
    let dom = new DOMParser().parseFromString(html, "text/html");
    let parser = new WtrlabParser();
    let author = parser.extractAuthor(dom);
    assert.equal(author, "<unknown>");
});
