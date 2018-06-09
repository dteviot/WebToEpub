
"use strict";

module("UtestLnmtlParser");

test("customRawDomToContentStep", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<div class=\"chapter-body\">" +
        "<sentence class=\"translated\">" +
        "<w data-title=\"良渚\">Liangzhu</w> <w data-title=\"大\">loudly</w> <w data-title=\"议政\">discussing politics</w> <w data-title=\"堂\">hall</w>, <w data-title=\"曾经\">once</w> the <w data-title=\"权力\">highest authority</w> <w data-title=\"机构\">organization</w> of <w data-title=\"异族\">alien race</w>, <w data-title=\"如今\">now</w> <w data-title=\"满地\">everywhere</w> a <w data-title=\"金乌\">sun</w> <w data-title=\"兵\">soldier</w> <w data-title=\"乱窜\">has scurried about</w>, <w data-title=\"漫天\">everywhere</w> <w data-title=\"金乌\">sun</w> <w data-title=\"兵乱\">war disasters</w> <w data-title=\"飞\">fly</w>.</sentence>" +
        "<sentence class=\"original\">" +
        "良渚大议政堂,曾经异族的最高权力机构,如今已经满地金乌道兵乱窜,漫天金乌道兵乱飞。</sentence>" +
        "</div>"
    );
    
    let parser = new LnmtlParser();
    parser.userPreferences = {
        removeOriginal: {
            value: true
        }
    };
    
    let content = parser.findContent(dom); 
    parser.customRawDomToContentStep(null, content);
    let actual = dom.getElementsByTagName("p");
    assert.equal(actual.length, 1);
    assert.equal(actual[0].outerHTML, "<p>Liangzhu loudly discussing politics hall, once the highest authority organization of alien race, now everywhere a sun soldier has scurried about, everywhere sun war disasters fly.</p>");
});

let volumesListInmtl = [
    {id: 1},
    {id: 2}
];

let pagesListsInmtl = [
    [
        { "current_page": 1, last_page: 2,
            data: [
                {title: "V1-C1", number: 1, site_url:"http://lnmtl.com/chapter/the-magus-era-chapter-1" }, 
                {title: "V1-C2", number: 2, site_url:"http://lnmtl.com/chapter/the-magus-era-chapter-2" }, 
            ]
        },
        { "current_page": 2, last_page: 2,
            data: [
                {title: "V1-C3", number: 3, site_url:"http://lnmtl.com/chapter/the-magus-era-chapter-3" }, 
                {title: "V1-C4", number: 4, site_url:"http://lnmtl.com/chapter/the-magus-era-chapter-4" }, 
            ]
        }
    ],
    [
        { "current_page": 1, last_page: 2,
            data: [
                {title: "V2-C1", number: 5, site_url:"http://lnmtl.com/chapter/the-magus-era-chapter-5" }, 
                {title: "V2-C2", number: 6, site_url:"http://lnmtl.com/chapter/the-magus-era-chapter-6" }, 
            ]
        },
        { "current_page": 2, last_page: 2,
            data: [
                {title: "V2-C3", number: 7, site_url:"http://lnmtl.com/chapter/the-magus-era-chapter-7" }, 
                {title: "V2-C4", number: 8, site_url:"http://lnmtl.com/chapter/the-magus-era-chapter-8" }, 
            ]
        }
    ]
]

let expectedLnmplFetchChapterListsOutput = [
    [
        {json: pagesListsInmtl[0][0]}, 
        {json: pagesListsInmtl[0][1]}
    ],
    [
        {json: pagesListsInmtl[1][0]},
        {json: pagesListsInmtl[1][1]}
    ]
];

function fetchJsonStubInmtl(url) {
    let lookup = new Map();
    lookup.set("http://lnmtl.com/chapter?page=1&volumeId=1", pagesListsInmtl[0][0]);
    lookup.set("http://lnmtl.com/chapter?page=2&volumeId=1", pagesListsInmtl[0][1]);
    lookup.set("http://lnmtl.com/chapter?page=1&volumeId=2", pagesListsInmtl[1][0]);
    lookup.set("http://lnmtl.com/chapter?page=2&volumeId=2", pagesListsInmtl[1][1]);
    return Promise.resolve({json: lookup.get(url)});
}

test("fetchChapterListsForVolume", function (assert) {
    let done = assert.async(); 
    LnmtlParser.fetchChapterListsForVolume(volumesListInmtl[0], fetchJsonStubInmtl).then(
        function(actual) {
            assert.deepEqual(actual, expectedLnmplFetchChapterListsOutput[0]); 
            done();
        }
    );
});

test("fetchChapterLists", function (assert) {
    let done = assert.async(); 
    LnmtlParser.fetchChapterLists(volumesListInmtl, fetchJsonStubInmtl).then(
        function(actual) {
            assert.deepEqual(actual, expectedLnmplFetchChapterListsOutput); 
            done();
        }
    );
});

test("mergeChapterLists", function (assert) {
    let actual = LnmtlParser.mergeChapterLists(expectedLnmplFetchChapterListsOutput);
    assert.equal(actual.length, 8);
    assert.deepEqual(actual[2],  {sourceUrl: "http://lnmtl.com/chapter/the-magus-era-chapter-3", title: "#3: V1-C3", newArc: null}); 
});
