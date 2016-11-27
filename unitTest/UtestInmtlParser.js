
"use strict";

module("UtestInmtlParser");

test("customRawDomToContentStep", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html><head><title></title></head><body>" +
        "<div class=\"chapter-body\">" +
        "<sentence class=\"translated\">" +
        "<w data-title=\"良渚\">Liangzhu</w> <w data-title=\"大\">loudly</w> <w data-title=\"议政\">discussing politics</w> <w data-title=\"堂\">hall</w>, <w data-title=\"曾经\">once</w> the <w data-title=\"权力\">highest authority</w> <w data-title=\"机构\">organization</w> of <w data-title=\"异族\">alien race</w>, <w data-title=\"如今\">now</w> <w data-title=\"满地\">everywhere</w> a <w data-title=\"金乌\">sun</w> <w data-title=\"兵\">soldier</w> <w data-title=\"乱窜\">has scurried about</w>, <w data-title=\"漫天\">everywhere</w> <w data-title=\"金乌\">sun</w> <w data-title=\"兵乱\">war disasters</w> <w data-title=\"飞\">fly</w>.</sentence>" +
        "<sentence class=\"original\">" +
        "良渚大议政堂,曾经异族的最高权力机构,如今已经满地金乌道兵乱窜,漫天金乌道兵乱飞。</sentence>" +
        "</div></body></html>",
        "text/html");
    
    let parser = new InmtlParser();
    let content = parser.findContent(dom); 
    parser.customRawDomToContentStep(null, content);
    let actual = dom.getElementsByTagName("p");
    assert.equal(actual.length, 1);
    assert.equal(actual[0].outerHTML, "<p>Liangzhu loudly discussing politics hall, once the highest authority organization of alien race, now everywhere a sun soldier has scurried about, everywhere sun war disasters fly.</p>");
});
