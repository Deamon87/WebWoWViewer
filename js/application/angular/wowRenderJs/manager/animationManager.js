import {vec4, mat4, vec3, quat} from 'gl-matrix';

export default class AnimationManager {

    constructor(m2File){
        this.m2File = m2File;

        this.mainAnimationId = 0;
        this.mainAnimationIndex = 0;

        this.currentAnimationIndex = 0;
        this.currentAnimationTime = 0;
        this.currentAnimationPlayedTimes = 0;

        this.nextSubAnimationIndex = -1;
        this.nextSubAnimationTime = 0;

        this.firstCalc = true;

        this.initBonesIsCalc();
        this.calculateBoneTree();
        this.setAnimationId(0);
    }

    setAnimationId(animationId) {
        var animation = this.m2File.animationLookup[animationId]; //Mounted animation
        if (animation > -1) {
            //Reset animation
            this.mainAnimationId = animationId;
            this.mainAnimationIndex = animation;

            this.currentAnimationIndex = animation;
            this.currentAnimationTime = 0;
            this.currentAnimationPlayedTimes = 0;

            this.nextSubAnimationIndex = -1;
            this.nextSubAnimationTime = 0;

            this.firstCalc = true; //TODO: reset this on going to next subAnimation too
        }
    }

    update(deltaTime, cameraPosInLocal, bonesMatrices, textAnimMatrices, subMeshColors, transparencies) {
        var mainAnimationRecord = this.m2File.animations[this.mainAnimationIndex];
        var currentAnimationRecord = this.m2File.animations[this.currentAnimationIndex];

        this.currentAnimationTime += deltaTime;
        /* Pick next animation if there is one and no nex animation was picked before */
        if (this.nextSubAnimationIndex < 0 && mainAnimationRecord.next_animation > -1) {
            var probability = Math.floor(Math.random() * (0x7fff + 1));
            var calcProb = 0;

            /* First iteration is out of loop */
            var currentSubAnimIndex = this.mainAnimationIndex;
            var subAnimRecord = this.m2File.animations[currentSubAnimIndex];
            calcProb += subAnimRecord.probability;
            while ((calcProb < probability) && (subAnimRecord.next_animation > -1)) {
                currentSubAnimIndex = subAnimRecord.next_animation;
                subAnimRecord = this.m2File.animations[currentSubAnimIndex];

                calcProb += subAnimRecord.probability;
            }

            this.nextSubAnimationIndex = currentSubAnimIndex;
            this.nextSubAnimationTime = 0;
        }

        if (this.nextSubAnimationIndex > 0) {
            //TODO: check blend time

        }
        if (this.currentAnimationTime > currentAnimationRecord.length) {
            this.currentAnimationTime = this.currentAnimationTime % currentAnimationRecord.length;
        }


        /* Update animated values */
        this.calcAnimMatrixes(textAnimMatrices, this.currentAnimationIndex, this.currentAnimationTime);
        this.calcBones(bonesMatrices, this.currentAnimationIndex, this.currentAnimationTime, cameraPosInLocal);
        this.calcSubMeshColors(subMeshColors, this.currentAnimationIndex, this.currentAnimationTime);
        this.calcTransparencies(transparencies, this.currentAnimationIndex, this.currentAnimationTime);
    }

    /* Init function */
    initBonesIsCalc() {
        var m2File = this.m2File;
        var bonesIsCalculated = new Array(m2File.nBones);

        for (var i = 0; i < m2File.nBones; i++) {
            bonesIsCalculated[i] = false;
        }

        this.bonesIsCalculated = bonesIsCalculated;
    }

    /* Interpolate functions */
    interpolateValues (currentTime, interpolType, time1, time2, value1, value2, valueType){
        //Support and use only linear interpolation for now
        if (interpolType == 0) {
            return value1;
        } else if (interpolType >= 1) {

            if (valueType == 1 || valueType == 3) {
                var result = vec4.create();
                quat.slerp(result, value1, value2, (currentTime - time1)/(time2 - time1));
            } else {
                var diff = vec4.create();
                vec4.subtract(diff, value2, value1);
                vec4.scale(diff, diff, (currentTime - time1)/(time2 - time1));
                var result = vec4.create();
                vec4.add(result, value1, diff);
            }

            return result;
        }
    }
    getTimedValue (value_type, currTime, maxTime, animation, animationBlock) {
        function convertInt16ToFloat(value){
            return (((value < 0) ? value + 32768 : value - 32767)/ 32767.0);
            //return (value / 32768) - 1.0
        }

        function convertValueTypeToVec4(value, type){
            if (type == 0) {
                return [value.x, value.y, value.z, 0];
            } else if (type == 1) {
                return [convertInt16ToFloat(value[0]),
                    convertInt16ToFloat(value[1]),
                    convertInt16ToFloat(value[2]),
                    convertInt16ToFloat(value[3])];
            } else if (type == 2) {
                return [value/32767,value/32767, value/32767, value/32767];
            } else if (type == 3) {
                return [value.x,value.y, value.z, value.w];
            }
        }

        var globalSequence = animationBlock.global_sequence;
        var interpolType = animationBlock.interpolation_type;

        var times = animationBlock.timestampsPerAnimation[animation];
        var values =  animationBlock.valuesPerAnimation[animation];

        //Hack
        if (times == undefined) {
            animation = 0;
            times = animationBlock.timestampsPerAnimation[animation];
            values =  animationBlock.valuesPerAnimation[animation];
        }
        if (times.length == 0) {
            return undefined;
        }

        if (globalSequence >=0) {
            maxTime = this.m2File.globalSequences[globalSequence];
        }

        var times_len = times.length;
        var result;
        if (times_len > 1) {
            //var maxTime = times[times_len-1];
            var animTime = currTime % maxTime;

            if (animTime > times[times_len-1] && animTime <= maxTime) {
                result = convertValueTypeToVec4(values[0], value_type);
            } else {
                result =  convertValueTypeToVec4(times[times_len-1], value_type);
                for (var i = 0; i < times_len; i++) {
                    if (times[i] > animTime) {
                        var value1 = values[i - 1];
                        var value2 = values[i];

                        var time1 = times[i - 1];
                        var time2 = times[i];

                        value1 = convertValueTypeToVec4(value1, value_type);
                        value2 = convertValueTypeToVec4(value2, value_type);

                        result = this.interpolateValues(animTime,
                            interpolType, time1, time2, value1, value2, value_type);

                        if (value_type == 1 || value_type == 3) {
                            vec4.normalize(result, result); //quaternion has to be normalized after lerp operation
                        }

                        break;
                    }
                }
            }
        } else {
            result = convertValueTypeToVec4(values[0], value_type);
        }

        return result;
    }

    /* Calculate animation transform */
    calcAnimationTransform(tranformMat, isBone,
                            pivotPoint, negatePivotPoint,
                            animationIndex, animationRecord, animationData,
                            time,
                            billboardMatrix)
    {
        transVec = mat4.translate(tranformMat, tranformMat, pivotPoint);

        if (animationData.translation.valuesPerAnimation.length > 0) {
            var transVec = this.getTimedValue(
                0,
                time,
                animationRecord.length,
                animationIndex,
                animationData.translation);

            if (transVec) {
                mat4.translate(tranformMat, tranformMat, [
                    transVec[0],
                    transVec[1],
                    transVec[2],
                    0
                ]);
            }
            this.isAnimated = true;
        }
        if (billboardMatrix != null) {
            mat4.multiply(tranformMat, tranformMat, billboardMatrix);
        } else if (animationData.rotation.valuesPerAnimation.length > 0) {
            var rotationType = (isBone)? 1: 3;

            var quaternionVec4 = this.getTimedValue(
                rotationType,
                time,
                animationRecord.length,
                animationIndex,
                animationData.rotation);

            if (quaternionVec4) {
                var orientMatrix = mat4.create();

                mat4.fromQuat(orientMatrix, quaternionVec4 );
                mat4.multiply(tranformMat, tranformMat, orientMatrix);
            }
            this.isAnimated = true;
        }

        if (animationData.scale.valuesPerAnimation.length > 0) {

            var scaleVec3 = this.getTimedValue(
                0,
                time,
                animationRecord.length,
                animationIndex,
                animationData.scale);

            if (scaleVec3) {
                mat4.scale(tranformMat, tranformMat, [
                        scaleVec3[0],
                        scaleVec3[1],
                        scaleVec3[2]
                    ]
                );
            }
            this.isAnimated = true;
        }
        mat4.translate(tranformMat, tranformMat, negatePivotPoint);
    }

    /* Texture function */
    calcAnimMatrixes (textAnimMatrices, animationIndex, time) {
        var m2File = this.m2File;

        var pivotPoint = vec4.create(0.5, 0.5, 0, 0);
        var negatePivotPoint = vec4.create();
        vec4.negate(negatePivotPoint, pivotPoint);

        var animationRecord = m2File.animations[animationIndex];
        for (var i = 0; i < m2File.texAnims.length; i++) {
            var textAnimData = m2File.texAnims[i];

            mat4.identity(textAnimMatrices[i]);
            this.calcAnimationTransform(textAnimMatrices[i], false, pivotPoint, negatePivotPoint, animationIndex, animationRecord, textAnimData, time, null);
        }
    }

    /* Bone init functions */
    calculateBoneTree() {
        var m2File = this.m2File;

        var childBonesLookup = new Array(m2File.bones.length);
        for (var i = 0; i < m2File.bones.length; i++) {
            var childBones = [];
            for (var j = 0; j < m2File.bones.length; j++) {
                if (m2File.bones[j].parent_bone == i) {
                    childBones.push(j)
                }
            }
            childBonesLookup[i] = childBones;
        }

        this.childBonesLookup = childBonesLookup;
    }

    /* Bone animation functons */
    calcBones (boneMatrices, animation, time, cameraPosInLocal) {
        var m2File = this.m2File;

        for (var i = 0; i < m2File.nBones; i++) {
            this.bonesIsCalculated[i] = false;
        }
        if (true /*this.firstCalc || this.isAnimated */) {
            //Animate everything with standard animation
            for (var i = 0; i < m2File.nBones; i++) {
                this.calcBoneMatrix(boneMatrices, i, animation, time, cameraPosInLocal);
            }

            /* Animate mouth */
            /*
             if (m2File.keyBoneLookup[6] > -1) { // BONE_HEAD = 6
             var boneId = m2File.keyBoneLookup[6];
             this.calcBoneMatrix(boneId, this.bones[boneId], animation, time, cameraPos, invPlacementMat);
             }
             if (m2File.keyBoneLookup[7] > -1) { // BONE_JAW = 7
             var boneId = m2File.keyBoneLookup[7];
             this.calcBoneMatrix(boneId, this.bones[boneId], animation, time, cameraPos, invPlacementMat);
             }
             */

            var closedHandAnimation = -1;
            if (m2File.animationLookup.length > 15 && m2File.animationLookup[15] > 0) { //ANIMATION_HANDSCLOSED = 15
                closedHandAnimation = m2File.animationLookup[15];
            }

            if (closedHandAnimation >= 0){
                if (this.leftHandClosed) {
                    for (var j = 0; j < 5; j++) {
                        if (m2File.keyBoneLookup[13 + j] > -1) { // BONE_LFINGER1 = 13
                            var boneId = m2File.keyBoneLookup[13 + j];
                            this.bonesIsCalculated[boneId] = false;
                            this.calcBoneMatrix(boneMatrices, boneId, closedHandAnimation, 1, cameraPosInLocal);
                            this.calcChildBones(boneMatrices, boneId, closedHandAnimation, 1, cameraPosInLocal)
                        }
                    }
                }
                if (this.rightHandClosed) {
                    for (var j = 0; j < 5; j++) {
                        if (m2File.keyBoneLookup[8 + j] > -1) { // BONE_RFINGER1 = 8
                            var boneId = m2File.keyBoneLookup[8 + j];
                            this.bonesIsCalculated[boneId] = false;
                            this.calcBoneMatrix(boneMatrices, boneId, closedHandAnimation, 1, cameraPosInLocal);
                            this.calcChildBones(boneMatrices, boneId, closedHandAnimation, 1, cameraPosInLocal)
                        }
                    }
                }

            }
        }
        this.firstCalc = false;
    }
    calcBoneMatrix (boneMatrices, boneIndex, animationIndex, time, cameraPosInLocal){
        if (this.bonesIsCalculated[boneIndex]) return;

        var m2File = this.m2File;

        var animationRecord = m2File.animations[animationIndex];
        var boneDefinition = m2File.bones[boneIndex];

        var parentBone = boneDefinition.parent_bone;

        /* 2. Prepare bone part of animation process */
        var tranformMat = boneMatrices[boneIndex];
        tranformMat = mat4.identity(tranformMat);

        if (boneDefinition.flags & 0x278 == 0) {
            this.bonesIsCalculated[boneIndex] = true;
            return
        }
        if (parentBone>=0) {
            this.calcBoneMatrix(boneMatrices, parentBone, animationIndex, time, cameraPosInLocal);
            mat4.multiply(tranformMat, tranformMat, boneMatrices[parentBone]);
        }
        var pivotPoint = vec4.fromValues(
            boneDefinition.pivot.x,
            boneDefinition.pivot.y,
            boneDefinition.pivot.z,
            0
        );
        var negatePivotPoint = vec4.fromValues(
            -boneDefinition.pivot.x,
            -boneDefinition.pivot.y,
            -boneDefinition.pivot.z,
            0
        );

        /* 2.1 Calculate billboard matrix if needed */
        var billboardMatrix = null;
        if (((boneDefinition.flags & 0x8) > 0) || ((boneDefinition.flags & 0x40) > 0)) {
            //From http://gamedev.stackexchange.com/questions/112270/calculating-rotation-matrix-for-an-object-relative-to-a-planets-surface-in-monog
            var modelForward = vec3.create();

            var cameraPoint = cameraPosInLocal;
            if (parentBone>=0) {
                var parentMatrix = boneMatrices[parentBone];
                var invertParentMat = mat4.create();
                mat4.invert(invertParentMat, parentMatrix);

                cameraPoint = vec4.create();

                vec4.transformMat4(cameraPoint, cameraPosInLocal, invertParentMat);
            }

            vec4.subtract(cameraPoint, cameraPoint, pivotPoint);

            vec3.normalize(modelForward, cameraPoint);

            if ((boneDefinition.flags & 0x40) > 0) {
                //Cylindrical billboard

                var modelUp = vec3.fromValues(0,0,1);

                var modelRight = vec3.create();
                vec3.cross(modelRight, modelUp, modelForward);
                vec3.normalize(modelRight, modelRight);

                vec3.cross(modelForward, modelRight, modelUp);
                vec3.normalize(modelForward, modelForward);

                vec3.cross(modelRight, modelUp, modelForward);
                vec3.normalize(modelRight, modelRight);

            } else {
                //Spherical billboard
                var modelRight = vec3.create();
                vec3.cross(modelRight, [0, 0, 1], modelForward);
                vec3.normalize(modelRight, modelRight);

                var modelUp = vec3.create();
                vec3.cross(modelUp, modelForward, modelRight);
                vec3.normalize(modelUp, modelUp);
            }


            billboardMatrix = mat4.fromValues(
                    modelForward[0],modelForward[1],modelForward[2],0,
                    modelRight[0],modelRight[1],modelRight[2],0,
                    modelUp[0],modelUp[1],modelUp[2],0,
                    0,0,0,1
                );
            this.isAnimated = true;
        }

        /* 3. Calculate matrix */
        this.calcAnimationTransform(tranformMat, true, pivotPoint, negatePivotPoint, animationIndex, animationRecord, boneDefinition, time, billboardMatrix);

        this.bonesIsCalculated[boneIndex] = true;
    }
    calcChildBones(boneMatrices, bone, animation, time, cameraPosInLocal) {
        var childBones = this.childBonesLookup[bone];
        for (var i = 0; i < childBones.length; i++) {
            var boneId = childBones[i];
            this.bonesIsCalculated[boneId] = false;
            this.calcBoneMatrix(boneMatrices, boneId, animation, time, cameraInlocalPos);
            this.calcChildBones(boneMatrices, boneId, animation, time, cameraPosInLocal);
        }
    }

    calcSubMeshColors (subMeshColors, animationIndex, time) {
        var colors = this.m2File.colors;
        var animationRecord = this.m2File.animations[animationIndex];

        for (var i = 0; i < colors.length; i++) {
            var colorVec = this.getTimedValue(
                0,
                time,
                animationRecord.length,
                animationIndex,
                colors[i].color);
            var alpha = this.getTimedValue(
                2,
                time,
                animationRecord.length,
                animationIndex,
                colors[i].alpha);

            if (colorVec) {
                subMeshColors[i] = [colorVec[0], colorVec[1], colorVec[2],1]
            } else {
                subMeshColors[i] = [1.0, 1.0, 1.0, 1.0]
            }
            if (alpha) {
                subMeshColors[i][3] = alpha[0];
            }
        }
    }
    calcTransparencies(transparencies, animationIndex, time) {
        var transparencyRecords = this.m2File.transparencies;
        var animationRecord = this.m2File.animations[animationIndex];

        for (var i = 0; i < transparencyRecords.length; i++) {
            var transparency = this.getTimedValue(
                2,
                time,
                animationRecord.length,
                animationIndex,
                transparencyRecords[i].values);

            if (transparency) {
                transparencies[i] = transparency[0];
            } else {
                transparencies[i] = 1.0;
            }
        }
    }
}