
"use strict";

module("UtestNepustationParser");

QUnit.test("basicCryptEngine", function (assert) {
    let sampleCypherText = "Ḙḱ ḃḝḇḱ ḑḥ ḏḉḁḫḱ.";
    let sampleClearText = "My body is heavy.";
    let engine = new CryptEngine();
    engine.buildLookup(CryptEngine.NEPUALPHABET, CryptEngine.ALPHABET);
    let actual = engine.decryptString(sampleCypherText);    
    assert.equal(actual, sampleClearText);
});
