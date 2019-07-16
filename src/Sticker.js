
export class Sticker{
    width;
    height;
    image;
    faceTop;
    faceLeft;
    faceBottom;
    faceRight;
    svg;
    constructor(opts){
        this.image = opts.image || null;
        this.width = opts.width || 0;
        this.height = opts.height || 0;
        this.faceLeft = opts.faceLeft || 0;
        this.faceTop = opts.faceTop || 0;
        this.faceBottom = opts.faceBottom || this.height;
        this.faceRight = opts.faceRight || this.width;
    }

    getHeight(){
        return this.height;
    }

    getWidth(){
        return this.width;
    }

    getFaceTop(){
        return this.faceTop;
    }

    getFaceLeft(){
        return this.faceLeft;
    }

    getFaceRight(){
        return this.faceRight;
    }

    getFaceBottom(){
        return this.faceBottom;
    }

    getFaceWidth(){
        return this.getFaceRight() - this.getFaceLeft();
    }

    getFaceHeight(){
        return this.getFaceBottom() - this.getFaceTop();
    }



    scaleFaceTopByStickerHeight(scaleStickerHeight){
        return this.getFaceTop() * (scaleStickerHeight/this.getHeight());
    }

    scaleFaceLeftByStickerWidth(scaleStickerWidth){
        return this.getFaceLeft() * (scaleStickerWidth/this.getWidth());
    }

    scaleFaceWidthByStickerWidth(scaleStickerWidth){
        return this.getFaceWidth() * (scaleStickerWidth/this.getWidth());
    }

    scaleFaceHeightByStickerHeight(scaleStickerHeight){
        return this.getFaceHeight() * (scaleStickerHeight/this.getHeight());
    }


    scaleStickerHeightByFaceHeight(scaleFaceHeight){
        return this.getHeight() * (scaleFaceHeight/this.getFaceHeight())
    }

    scaleStickerWidthByFaceWidth(scaleFaceWidth){
        return this.getWidth() * (scaleFaceWidth/this.getFaceWidth());
    }




    scaleToCoverFace(targetFaceLeft, targetFaceTop, targetFaceWidth, targetFaceHeight){

        let stickerWidth, stickerHeight, scale;

        if(targetFaceWidth>targetFaceHeight){
            const scaleHeight = this.scaleStickerHeightByFaceHeight(targetFaceHeight);
            stickerHeight = scaleHeight;
            stickerWidth = scaleHeight * this.getWidth() / this.getHeight();
            scale = scaleHeight / this.getHeight();
        }

        else{
            const scaleWidth = this.scaleStickerWidthByFaceWidth(targetFaceWidth);
            stickerWidth = scaleWidth;
            stickerHeight = scaleWidth * this.getHeight() / this.getWidth();
            scale = scaleWidth / this.getWidth();
        }

        const faceLeftOffset = this.scaleFaceLeftByStickerWidth(stickerWidth);
        const faceTopOffset = this.scaleFaceTopByStickerHeight(stickerHeight);



        return {
            //shift the sticker over so that the face of the sticker is in the right place
            left: targetFaceLeft - faceLeftOffset,
            top: targetFaceTop - faceTopOffset,
            width: stickerWidth,
            height: stickerHeight,
            scale: scale
        }
    }
}