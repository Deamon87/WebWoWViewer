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
    static multiQuickSort(items, left, right, firstCompareFunc, secondCompareFunc) {
        QuickSort.quickSort(items, left, right, firstCompareFunc);
        var newLeft = left;
        var newRight = 1;
        while (newRight <= right)  {
            if (firstCompareFunc(items[newLeft], items[newRight]) != 0) {
                if (newRight - newLeft > 1) {
                    QuickSort.quickSort(items, newLeft, newRight - 1, secondCompareFunc)
                }
                newLeft = newRight;
            }
            newRight++
        }
        if (newRight - newLeft > 1) {
            QuickSort.quickSort(items, newLeft, newRight - 1, secondCompareFunc)
        }
    }


}
export default QuickSort;