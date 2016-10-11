class QuickSort {
    static swapItems(items, firstIndex, secondIndex){
        var temp = items[firstIndex];
        items[firstIndex] = items[secondIndex];
        items[secondIndex] = temp;
    }

    static partition(items, left, right, compareFunc) {

        var pivot   = items[Math.floor((right + left) / 2)],
            i       = left,
            j       = right;


        while (i <= j) {

            while (compareFunc(items[i], pivot) < 0) {
                i++;
            }

            while (compareFunc(items[j], pivot) > 0){
                j--;
            }

            if (i <= j) {
                QuickSort.swapItems(items, i, j);
                i++;
                j--;
            }
        }

        return i;
    }

    static quickSort(items, left, right, compareFunc) {
        var index;

        if (items.length > 1) {

            index = QuickSort.partition(items, left, right, compareFunc);

            if (left < index - 1) {
                QuickSort.quickSort(items, left, index - 1, compareFunc);
            }

            if (index < right) {
                QuickSort.quickSort(items, index, right, compareFunc);
            }

        }

        return items;
    }
    static multiQuickSort(items, left, right) {
        var compareTimes = arguments.length - 3;
        var compareFuncs = new Array(compareTimes);
        for (var i = 0; i < compareFuncs.length; i++) {
            compareFuncs[i] = arguments[3 + i];
        }

        QuickSort.quickSort(items, left, right, compareFuncs[0]);
        if (compareFuncs.length > 1) {
            for (var i = 1; i < compareTimes; i++) {
                var newLeft = left;
                var newRight = 1;
                while (newRight <= right) {
                    var compareResult = false;
                    for (var j = 0; (j < i) && (!compareResult); j++) {
                        compareResult = compareResult || (compareFuncs[j](items[newLeft], items[newRight]) != 0)
                    }
                    if (compareResult) {
                        if (newRight - newLeft > 1) {
                            QuickSort.quickSort(items, newLeft, newRight - 1, compareFuncs[i])
                        }
                        newLeft = newRight;
                    }
                    newRight++
                }
                if (newRight - newLeft > 1) {
                    QuickSort.quickSort(items, newLeft, newRight - 1, compareFuncs[i])
                }
            }
        }
    }

}
export default QuickSort;