
"use strict";

module("UtestEpubMetaInfo");

QUnit.test("decensor", function (assert) {
    
    assert.equal(EpubMetaInfo.decensor("F**ked"), "Fucked");
    assert.equal(EpubMetaInfo.decensor("S*x"), "Sex");
    assert.equal(EpubMetaInfo.decensor("Homos*xual"), "Homosexual");
    assert.equal(EpubMetaInfo.decensor("clean"), "clean");
    assert.equal(EpubMetaInfo.decensor("***"), "***");
    assert.equal(EpubMetaInfo.decensor("S*x S*aves"), "Sex Slaves");
    assert.equal(EpubMetaInfo.decensor("Prostit**es"), "Prostitutes");
});
