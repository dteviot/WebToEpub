
"use strict";

module("UserPreferences");


test("checkNameExists", function (assert) {
    window.localStorage.clear();
    let up1 = new UserPreferences();

    try {
        up1.checkNameExists("removeDuplicateImages");
    } catch (e) {
        assert.fail("name that exists should not throw");
    }

    // name that does not exist should throw
    let didThrow = false;
    try {
        up1.checkNameExists("doesNotExist");
    } catch (e) {
        didThrow = true;
    }
    assert.equal(didThrow, true);
});

test("writeToLocalStorage", function (assert) {
    window.localStorage.clear();
    let up1 = new UserPreferences();
    assert.equal(up1.removeDuplicateImages, false);
    assert.equal(up1.includeImageSourceUrl, true);

    up1.removeDuplicateImages = true;
    up1.includeImageSourceUrl = false;
    up1.writeToLocalStorage();

    up1 = new UserPreferences();
    assert.equal(up1.removeDuplicateImages, false);
    assert.equal(up1.includeImageSourceUrl, true);

    let up2 = UserPreferences.readFromLocalStorage();
    assert.equal(up2.removeDuplicateImages, true);
    assert.equal(up2.includeImageSourceUrl, false);
});
