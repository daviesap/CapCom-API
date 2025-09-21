function tripledivide({valueA, valueB, valueC}) {
    var result = ((valueA / valueB) / valueC);
    return (result);
}

var valueD = 1000;
var valueE = 100;
var valueF = 10;

const answer = tripledivide({valueA:valueD,valueB:valueE,valueC:valueF});
console.log(`The answer of ${valueD} divided by ${valueE} divided by ${valueF} is ${answer}`);
