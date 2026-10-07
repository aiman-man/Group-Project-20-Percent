function isBlank(input) {
    return input.value.trim() === "";
}

function makeClean(input) {
    input.classList.remove("error");
}

window.addEventListener("load", function() {

    var hilightable = document.querySelectorAll(".hilightable");

    for (var i = 0; i < hilightable.length; i++) {

        hilightable[i].addEventListener("focus", function() {
            this.classList.add("hilight");
        });

        hilightable[i].addEventListener("blur", function() {
            this.classList.remove("hilight");
        });
    }

    var requiredInputs = document.querySelectorAll(".required");

    for (var i = 0; i < requiredInputs.length; i++) {
        requiredInputs[i].addEventListener("change", function(e) {
            makeClean(e.target);
        });
    }

    var mainForm = document.getElementById("mainForm");

    mainForm.addEventListener("submit", function(e) {

        var requiredInputs = document.querySelectorAll(".required");

        for (var i = 0; i < requiredInputs.length; i++) {

            if (isBlank(requiredInputs[i])) {
                e.preventDefault();
                requiredInputs[i].classList.add("error");
            } else {
                makeClean(requiredInputs[i]);
            }
        }
    });

});

