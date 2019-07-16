<template>
    <div class="hello">

        <canvas id="imageCanvas" ref="imageCanvas"></canvas>
        <div id="controls">
            <button @click="showStickers = !showStickers" id="stickerButton" class="btn btn-info">
                <i class="fa fa-smile-o" aria-hidden="true"></i> Stickers
            </button>
            <span v-if="sticker">
                <label>Face top: <input @change="addSticker(sticker)" type="number" v-model="sticker.faceTop" style="width:60px" step="100"></label>
                <label>Face left: <input @change="addSticker(sticker)" type="number" v-model="sticker.faceLeft" style="width:60px" step="100"></label>
                <label>Face right: <input @change="addSticker(sticker)" type="number" v-model="sticker.faceRight" style="width:60px" step="100"></label>
                <label>Face bottom: <input @change="addSticker(sticker)" type="number" v-model="sticker.faceBottom" style="width:60px" step="100"></label>
            </span>

        </div>
        <div id="stickerList" v-show="showStickers">
            <img v-bind:key="sticker.image" @click="addSticker(sticker)" v-for="sticker in stickers" :src="sticker.image">
        </div>
    </div>
</template>

<script>
    /* eslint-disable */
    import {fabric} from 'fabric-with-gestures';
    import stickers from "../stickers";

    const eventHandlers = {
        'resize': ['resetSize'],
        'orientationchange': ['resetSize'],
        'keydown': ['keyHandler']
    };


    export default {
        name: 'Blocker',
        data () {
            return {
                msg: 'Welcome to Your Vue.js App',
                canvas:null,
                stickers: stickers,
                showStickers: false,
                scale:1,
                imageWidth:1,
                imageHeight:1,
                sticker: null

            }
        },
        computed:{

        },
        methods: {

            clearImage(){
                this.image = null;
                this.removeAll();

                const c = this.canvas;
                c.backgroundImage = false;
                c.renderAll();
            },
            updateCanvasImage(e){
                let files = e.target.files;

                let reader = new FileReader();

                reader.onload = () => {
                    let img = new Image();

                    img.onload = ()=> {
                        this.image = img;

                        this.removeAll();
                    }
                    img.src = event.target.result;
                };
                reader.readAsDataURL(files[0]);


            },

            removeItem(){
                let c = this.canvas;
                c.getActiveObjects().forEach((o)=>{
                    c.remove(o);
                })
                c.discardActiveObject();


            },

            setBackgroundImage(){
                let img = this.image;
                if(img){
                    let c = this.canvas;
                    let fImg = new fabric.Image(img);

                    let original_width = img.width;
                    let original_height = img.height;
                    let bound_width = c.width;
                    let bound_height = c.height;
                    let new_width = original_width;
                    let new_height = original_height;

                    if (original_width > bound_width) {
                        //scale width to fit
                        new_width = bound_width;
                        //scale height to maintain aspect ratio
                        new_height = (new_width * original_height) / original_width;
                        this.scale = new_height / original_height;
                    }

                    if (new_height > bound_height) {
                        //scale height to fit instead
                        new_height = bound_height;
                        //scale width to maintain aspect ratio
                        new_width = (new_height * original_width) / original_height;

                        this.scale = new_width / original_width;
                    }

                    this.imageWidth = new_width;
                    this.imageHeight = new_height;
                    c.setBackgroundImage(fImg, c.renderAll.bind(c),{
                        originX: 'center',
                        originY: 'center',
                        left: c.width/2,
                        top: c.height/2,
                        scaleX: new_width / img.width,
                        scaleY: new_height / img.height

                    });
                }

            },


            addSticker(sticker, settings = {}){

                this.removeAll();

                this.sticker = sticker;


                let c = this.canvas;

                const defaultOptions = {
                    left: 60,
                    top: 60,
                    width: 200,
                    height: 200
                }


                settings = Object.assign(defaultOptions, settings);

                fabric.loadSVGFromURL(sticker.image, function(objects, options){
                    let obj = fabric.util.groupSVGElements(objects, options);
                    if(settings.width>settings.height){
                        obj.scaleToHeight(settings.height).set({left: settings.left, top: settings.top}).setCoords();
                    }
                    else{
                        obj.scaleToWidth(settings.width).set({left: settings.left, top: settings.top}).setCoords();
                    }


                    obj.addWithUpdate(new fabric.Rect({
                        width: sticker.scaleFaceWidthByStickerWidth(obj.getScaledWidth()),
                        height: sticker.scaleFaceHeightByStickerHeight(obj.getScaledHeight()),
                        left: settings.left + sticker.scaleFaceLeftByStickerWidth(obj.getScaledWidth()),
                        top: settings.top + sticker.scaleFaceTopByStickerHeight(obj.getScaledHeight()),
                        fill:'rgba(0,0,0,0)',
                        stroke: 'black',
                        strokeWidth: 1
                    }))


                    c.add(obj).renderAll();

                    c.setActiveObject(c.item(c.getObjects().length-1));

                    c.renderAll();


                })
            },
            clearControls(){
                this.showStickers = false;
            },
            selectAll(){
                const c = this.canvas;
                c.discardActiveObject();
                const sel = new fabric.ActiveSelection(c.getObjects(), {
                    canvas: c,
                });
                c.setActiveObject(sel);
                c.requestRenderAll();
            },
            confirmBefore(fn, message="Are you sure?", onlyIfImage=false){

                if((onlyIfImage && !this.image) || confirm(message)){
                    fn();
                }

            },
            removeAll(){

                let c = this.canvas;
                let stickers = c.getObjects();
                stickers.forEach((sticker)=>{

                    c.remove(sticker);
                });
                c.renderAll();

            },
            selectionSet(){
                this.selection = true;
            },
            selectionCleared(){
                this.selection = false;
            },
            resetSize() {
                let c = this.canvas;
                c.setWidth(window.innerWidth);
                c.setHeight(window.innerHeight - document.getElementById('controls').clientHeight);
                document.getElementById('stickerList').style.left = document.getElementById('stickerButton').offsetLeft + "px";
                document.getElementById('stickerList').style.bottom = (document.getElementById('controls').clientHeight - 10) + "px";

            },

            keyHandler(e){
                if(e.key === 'Delete' || e.key === 'Backspace'){
                    this.removeItem();
                }
                if(e.key === 'a' && (e.getModifierState('Meta') || e.getModifierState('Control'))){
                    this.selectAll();
                }


                if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.key) > -1){
                    let step = 5;
                    if(e.getModifierState('Shift')){
                        step = 1;
                    }
                    this.moveSelection(e.key.toLowerCase().replace('arrow',''), step);
                }

            },

            moveSelection(direction, step){
                const canvas = this.canvas;
                const activeObject = canvas.getActiveObject();

                if (activeObject) {
                    switch (direction) {
                        case 'left':
                            activeObject.left -= step;
                            break;
                        case 'up':
                            activeObject.top -= step;
                            break;
                        case 'right':
                            activeObject.left += step;
                            break;
                        case 'down':
                            activeObject.top += step;
                            break;
                    }
                    activeObject.setCoords();
                    canvas.renderAll();
                }
            },

            keyHandler(e){
                if(e.key === 'Delete' || e.key === 'Backspace'){
                    this.removeItem();
                }
                if(e.key === 'a' && (e.getModifierState('Meta') || e.getModifierState('Control'))){
                    this.selectAll();
                }


                if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.key) > -1){
                    let step = 5;
                    if(e.getModifierState('Shift')){
                        step = 1;
                    }
                    this.moveSelection(e.key.toLowerCase().replace('arrow',''), step);
                }

            }

        },
        mounted(){
            this.canvas = new fabric.Canvas('imageCanvas', {
                selectionLineWidth: 2
            });
            this.resetSize();
            let c = this.canvas;
            c.on({
                'selection:created':this.selectionSet,
                'selection:updated':this.selectionSet,
                'selection:cleared':this.selectionCleared,
                'mouse:down':this.clearControls,

            })
        },
        created(){
            // resetSizeEvents.forEach((e)=>{
            //   window.addEventListener(e,this.resetSize);
            // });
            const eventEntries = Object.entries(eventHandlers);
            for(const [event, handlers] of eventEntries){
                handlers.forEach((handler)=>{
                    if(this.hasOwnProperty(handler)){
                        window.addEventListener(event, this[handler]);
                    }

                })
            }

        },
        destroyed(){
            // resetSizeEvents.forEach((e)=>{
            //   window.removeEventListener(e,this.resetSize);
            // });
            const eventEntries = Object.entries(eventHandlers);
            for(const [event, handlers] of eventEntries){
                handlers.forEach((handler)=>{
                    if(this.hasOwnProperty(handler)){
                        window.removeEventListener(event, this[handler]);
                    }

                })
            }
        }
    }

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    canvas{
        border-style:solid;
        border-width:1px;
        width:500px;
    }
    #controls{
        padding:10px;
        background-color:black;
        text-align:center;
    }
    #stickerList{
        background-color:white;
        width:210px;
        height:300px;
        border-style:solid;
        border-width:1px;
        text-align:left;
        position:absolute;
        bottom:0;
        overflow-y:auto;
        -webkit-user-select: none;  /* Chrome all / Safari all */
        -moz-user-select: none;     /* Firefox all */
        -ms-user-select: none;      /* IE 10+ */
        user-select: none;          /* Likely future */
    }
    #stickerList img{
        width:50px;
        padding:5px;
    }


    #finalImageContainer img{
        max-width:100%;
        max-height:100%;

    }


</style>
