export default function (dbcFilePath) {
    var deferred = $q.defer();

    var dbcHeaderLen = 20;

    fileLoader(dbcFilePath).then(function success(a) {
        var fileReader = fileReadHelper(a);
        var offset = {offs : 0};


        var dbcIdent = fileReader.readString(offset, 4);

        var rowCount = fileReader.readInt32(offset);
        var colCount = fileReader.readInt32(offset);
        var rowSize  = fileReader.readInt32(offset);
        var textSize = fileReader.readInt32(offset);

        var textSectionStart = dbcHeaderLen + rowCount* (colCount*4);

        function calcOffset(row, col){
            var offs =  dbcHeaderLen + row * (colCount * 4) + col * 4;
            return {offs : offs};
        }
        function getTextOffset(row, col) {
            var offs = calcOffset(row, col);
            var textOffs = fileReader.readUint32(offs);

            var result = textSectionStart + textOffs;
            return result;
        }


        var dbcObject = {
            fileSize    : a.byteLength ,
            getRowCount : function() {
                return rowCount;
            },
            getColCount : function() {
                return colCount;
            },
            getRowSize  : function() {
                return rowSize;
            },
            readInt32 : function (row, col) {
                var offs = calcOffset(row, col);
                return fileReader.readInt32(offs, true);
            },
            readUInt32 : function (row, col){
                var offs = calcOffset(row, col);
                return fileReader.readUint32(offs, true);
            },
            readText : function (row, col) {
                var textOffs = getTextOffset(row, col);
                return fileReader.readString(textOffs, textSize);
            }
        };

        deferred.resolve(dbcObject);
    }, function error(){
        deferred.reject(null);
    });

    return deferred.promise;
};
