
"use strict";

module("UserPreferences");


test("checkNameExists", function (assert) {
    window.localStorage.clear();
    let up1 = new UserPreferences();

    try {
        up1.removeDuplicateImages.value;
    } catch (e) {
        assert.fail("name that exists should not throw");
    }

    // name that does not exist should throw
    let didThrow = false;
    try {
        up1.doesNotExist.value;
    } catch (e) {
        didThrow = true;
    }
    assert.equal(didThrow, true);
});

test("ctor", function (assert) {
    let up1 = new UserPreferences();
    assert.ok(up1.removeDuplicateImages instanceof BoolUserPreference);
    assert.ok(up1.styleSheet instanceof StringUserPreference);
});

test("writeToLocalStorage", function (assert) {
    window.localStorage.clear();
    let up1 = new UserPreferences();
    assert.equal(up1.removeDuplicateImages.value, false);
    assert.equal(up1.includeImageSourceUrl.value, true);

    up1.removeDuplicateImages.value = true;
    up1.includeImageSourceUrl.value = false;
    up1.writeToLocalStorage();

    up1 = new UserPreferences();
    assert.equal(up1.removeDuplicateImages.value, false);
    assert.equal(up1.includeImageSourceUrl.value, true);

    let up2 = UserPreferences.readFromLocalStorage();
    assert.equal(up2.removeDuplicateImages.value, true);
    assert.equal(up2.includeImageSourceUrl.value, false);
});
