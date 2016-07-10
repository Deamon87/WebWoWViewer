import MDXObject from './worldObject.js';


class WorldUnit {
    constructor(sceneApi){
        this.sceneApi =sceneApi;
        this.m2Object = null;

    }

    setDisplayId( value ) {
        var cdid = this.sceneApi.getCreatureDisplayInfoDBC();
        var cmdd = this.sceneApi.getCreatureModelDataDBC();

        var displayInf = cdid[value];
        var displayIDScale = displayInf.modelScale;

        var modelFilename = cmdd[displayInf.model1].modelName;
        var modelScale = cmdd[displayInf.model1].modelScale;
             12




    }
    setEntry ( value ) {
        this.entry = value;

        //1. Get displayId from entry


        //2. Set displayId
        this.setDisplayId(0)
    }
}