// Lab7.js
const tax_rate = 0.10;
const shipping_threshold = 1000;
var subtotal = 0;

for (var i = 0; i < titles.length; i++) {
    let total = calculateTotal(quantities[i], prices[i]);
    subtotal += total;
    outputCartRow(filenames[i], titles[i], quantities[i], prices[i], total);
}

var tax = calculateTax(subtotal, tax_rate);
var shipping = calculateShipping(subtotal, shipping_threshold);
var grand = calculateGrandTotal(subtotal, tax, shipping);

function outputCurrency(num) {
    document.write(num.toFixed(2));
}