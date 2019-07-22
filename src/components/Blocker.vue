  <template>
    <div class="hello">
      <div v-if="!image" id="noImage">
        Click "New image" below to get started.
      </div>
      <canvas id="imageCanvas" ref="imageCanvas"></canvas>
      <div id="controls">
        <label for="imageLoader">
          <span class="btn btn-primary" @click="confirmNewImage"><i class="fa fa-image"></i> New image</span>
          <input style="display:none;" type="file" id="imageLoader" @change="updateCanvasImage"/>
        </label>

        <button class="btn btn-success" :disabled="!image" @click="saveImage"><i class="fa fa-save"></i> Save image</button>
        <button class="btn btn-light" @click="rotateImage(-90)" :disabled="!image">Rotate left</button>
        <button class="btn btn-light" @click="rotateImage(90)" :disabled="!image">Rotate right</button>
        <button @click="showStickers = !showStickers" :disabled="!image" id="stickerButton" class="btn btn-info">
         <i class="fa fa-smile-o" aria-hidden="true"></i> Stickers
        </button>
        <button class="btn btn-secondary" :disabled="!image || detectingFaces" @click="autoCover">{{detectingFaces ? "Detecting faces..." : "Auto cover faces"}}</button>
        <button class="btn btn-danger" :disabled="!selection" @click.prevent="removeItem"><i class="fa fa-trash" aria-hidden="true"></i> Remove selected stickers
        </button>
        <button class="btn btn-warning" @click="removeAll" :disabled="stickerCount == 0"><i class="fa fa-refresh" aria-hidden="true"></i> Remove all stickers</button>
        <button class="btn btn-light" :disabled="!image || loadingHistory || undoStack.length===0" @click="undo">Undo</button>
        <button class="btn btn-light" :disabled="!image || loadingHistory || redoStack.length===0" @click="redo">Redo</button>



      </div>
      <div id="stickerList" v-show="showStickers">
        <img v-bind:key="sticker.image" @click="addSticker(sticker)" v-for="sticker in stickers" :src="sticker.image">
      </div>
      <div id="finalImageContainer" v-if="finalImage">
        <img :src="finalImage">
        <button id="close" @click="closeFinalImage" class="btn btn-danger">x</button>
      </div>
    </div>
  </template>

  <script>
    /* eslint-disable */
    import {fabric} from 'fabric-with-gestures';

    import * as faceapi from 'face-api.js';
    import stickers from "../stickers";

    window.faceapi = faceapi;


    // const resetSizeEvents = ['resize','orientationchange'];

    const eventHandlers = {
      'resize': ['resetSize'],
      'orientationchange': ['resetSize'],
      'keydown': ['keyHandler']
    };



    function shuffle(input) {
      const array = input.slice(0);
      var currentIndex = array.length, temporaryValue, randomIndex;

      // While there remain elements to shuffle...
      while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }

      return array;
    }

   export default {
    name: 'Blocker',
    data () {
      return {
        msg: 'Welcome to Your Vue.js App',
        canvas:null,
        stickers: stickers,
        selection: false,
        showStickers: false,
        finalImage:null,
        scale:1,
        imageWidth:1,
        imageHeight:1,
        imageAngle: 0,
        image: null,
        detectingFaces: false,
        pauseSaving: false,
        undoStack: [],
        redoStack: [],
        currentState: null,
        loadingHistory: false,
        zoomFactor: 1,
        maxZoomFactor: 2,
        minZoomFactor: 0.5,

      }
    },
    computed:{
      stickerCount(){
        let c = this.canvas;
        if(c){
          return c.getObjects().length;
        }

        return 0;
      }
    },
     watch:{
      scale: function(newScale, oldScale){
        this.updateZoom();
      },
       zoomFactor: function(newZoom, oldZoom){
        this.updateZoom();
       }
     },
    methods: {


      confirmNewImage(e){
        if(this.image && !confirm('Are you sure you wish to add a new image? This will erase your current one')) {
          e.preventDefault();
        }
        else if(this.image){
          this.clearImage();
        }
      },
      clearImage(){
        this.image = null;
        this.removeAll();
        this.resetZoom();
        const c = this.canvas;
        c.backgroundImage = false;
        c.renderAll();
        this.clearHistory();
      },
      updateCanvasImage(e){
          let files = e.target.files;

          let reader = new FileReader();

          reader.onload = () => {
            let img = new Image();

            img.onload = ()=> {
              this.image = img;

                this.removeAll();
                this.setBackgroundImage();
            }
            img.src = event.target.result;
          };
          reader.readAsDataURL(files[0]);


      },

      clearControls(){
        this.showStickers = false;
      },

      rotateSticker(obj, rotation){
        const c = this.canvas;
        let canvasCenter = new fabric.Point(c.getWidth() / 2, c.getHeight() / 2) // center of canvas
        let radians = fabric.util.degreesToRadians(rotation)
        let objectOrigin = new fabric.Point(obj.left, obj.top)
        let new_loc = fabric.util.rotatePoint(objectOrigin, canvasCenter, radians)
        obj.top = new_loc.y
        obj.left = new_loc.x
        obj.angle += rotation //rotate each object by the same angle
        obj.setCoords()

        c.renderAll();

      },


      rotateImage(rotation){
        this.imageAngle += rotation;
        this.setBackgroundImage();

        const c = this.canvas;
        // let canvasCenter = new fabric.Point(c.getWidth() / 2, c.getHeight() / 2) // center of canvas
        // let radians = fabric.util.degreesToRadians(rotation)

        c.getObjects().forEach((obj) => {
          this.rotateSticker(obj, rotation);
        });

        // c.renderAll()

        this.saveState();

      },

      clearHistory(){
        this.currentState = null;
        this.undoStack.length = 0;
        this.redoStack.legnth = 0;
      },

      async detectFaces() {
        if (!this.isFaceDetectionModelLoaded()) {
          await this.getFaceDetectionNet().load('/models')
        }
        const options = this.getFaceDetectorOptions()
        const results = await faceapi.detectAllFaces(this.image, options)
        return results;
      },

      getFaceDetectionNet() {
      return faceapi.nets.tinyFaceDetector
    },

     isFaceDetectionModelLoaded() {
      return !!this.getFaceDetectionNet().params
    },

     getFaceDetectorOptions() {
      const inputSize = 32*32;
      return new faceapi.TinyFaceDetectorOptions({ inputSize });
    },
      getStickerChoices(){
        return shuffle(this.stickers);
      },

      withoutSaving(action, saveAtEnd = true){
        this.pauseSaving = true;
        new Promise((resolve, reject)=>{
          action(resolve, reject);
        }).then(()=>{
          this.pauseSaving = false;
          if(saveAtEnd){
            this.saveState();
          }
        }).catch((e)=>{
          console.log(e);
          this.pauseSaving = false;
        });


      },

      async autoCover(){

          this.detectingFaces = true;
          const detections = await this.detectFaces();

          if(detections.length>0){
            this.withoutSaving(async (resumeSaving, error)=>{
            let stickers = this.getStickerChoices();
            for(let i=0; i<detections.length; i++) {
              const detection = detections[i];

              const box = detection.box;

              const sticker = stickers.pop();

              const c = this.canvas;

              const centerX = c.width / 2;
              const centerY = c.height / 2;

              const imgLeft = centerX - (this.imageWidth / 2);
              const imgTop = centerY - (this.imageHeight / 2);

              // const width = this.scale * box.width;
              // const height = this.scale * box.height;
              // const left = (this.scale * box.x) + (imgLeft);
              // const top = (this.scale * box.y) + (imgTop);

              const width = box.width;
              const height = box.height;
              const left =  box.x + imgLeft;
              const top = box.y + imgTop;



              const obj = await this.addStickerAsync(sticker, {
                height: height,
                width: width,
                left: left,
                top: top
              });
              this.rotateSticker(obj, this.imageAngle);
              if (stickers.length === 0) {
                stickers = this.getStickerChoices();
              }
            }
            this.detectingFaces = false;
            resumeSaving();

          });


          }
          else{
            this.detectingFaces = false;
          }






      },

      updateZoom(){
        const c = this.canvas;
        const center = new fabric.Point(c.width/2,c.height/2);
        const zoomLevel = this.scale * this.zoomFactor;
        c.viewportTransform = [1,0,0,1,0,0]
        c.zoomToPoint(center, zoomLevel);
        c.renderAll();
      },

      resetZoom(){
        this.zoomFactor = 1;
      },

      resetSize() {
        let c = this.canvas;
        this.resetZoom();
        c.setWidth(window.innerWidth);
        c.setHeight(window.innerHeight - document.getElementById('controls').clientHeight);
        c.calcOffset();
        c.renderAll();



        document.getElementById('stickerList').style.left = document.getElementById('stickerButton').offsetLeft + "px";
        document.getElementById('stickerList').style.bottom = (document.getElementById('controls').clientHeight - 10) + "px";

        this.setBackgroundImage();
      },

      setBackgroundImage(){
        let img = this.image;
        if(img){
          let c = this.canvas;
          let fImg = new fabric.Image(img);
          fImg.rotate(this.imageAngle);

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
            scaleX: 1,
            scaleY: 1
          });

          this.updateZoom();
        }
      },

      removeItem(){
        this.withoutSaving((resumeSaving)=>{
          let c = this.canvas;
          c.getActiveObjects().forEach((o)=>{
            c.remove(o);
          })
          c.discardActiveObject();
          resumeSaving();
        })
      },
      saveImage(){
        let c = this.canvas;
        let image = c.toDataURL({
          format: 'jpeg',
          quality: 0.8,
          multiplier: 1/(this.scale*this.zoom),
          width: this.imageWidth,
          height: this.imageHeight,
          left: (c.width - this.imageWidth)/2,
          top: (c.height - this.imageHeight)/2
        })

        this.finalImage = image;

      },
      closeFinalImage(){
        this.finalImage = null
      },
      saveState(){
        const c = this.canvas;
        const state = {
          canvas: c.toObject(),
          imageAngle: this.imageAngle
        };
        if(!this.pauseSaving){
          delete state.backgroundImage;
          if(this.currentState){
            this.undoStack.push(this.currentState);
          }
          this.currentState = state;
          this.redoStack.length = 0;
        }
      },

      undo(){
        if(this.undoStack.length>0){
          const action = this.undoStack.pop();
          if(this.currentState){
            this.redoStack.push(this.currentState);
          }
          this.loadFromHistory(action);
          this.currentState = action;
        }
      },
      redo(){
        if(this.redoStack.length>0){
          const action = this.redoStack.pop()
          this.loadFromHistory(action);
          if(this.currentState){
            this.undoStack.push(this.currentState);
          }
          this.currentState = action;
        }
      },

      loadFromHistory(state){
        this.loadingHistory = true;
        this.withoutSaving((resumeSaving)=>{
          const c = this.canvas;
          c.clear();
          this.imageAngle = state.imageAngle;
          c.loadFromJSON(state.canvas, ()=>{

            this.setBackgroundImage();
            this.loadingHistory = false;
            c.renderAll();
            resumeSaving();
          });

        }, false);


      },

      addSticker(sticker, settings){
        return this.addStickerAsync(sticker, settings);
      },

      async addStickerAsync(sticker, settings = {}){

        let c = this.canvas;

        const defaultOptions = {
          left: c.width/2,
          top: c.height/2,
          width: 50,
          height: 50
        }


        settings = Object.assign(defaultOptions, settings);


        let objects, options;

        await new Promise((resolve)=>{
          fabric.loadSVGFromURL(sticker.image, (obj, opt)=>{
            objects = obj;
            options= opt;
            resolve();
          })
        })
        let obj = fabric.util.groupSVGElements(objects, options);

        const stickerPlacement = sticker.scaleToCoverFace(settings.left, settings.top, settings.width, settings.height);
        obj.set({left: stickerPlacement.left, top: stickerPlacement.top, scaleX: stickerPlacement.scale, scaleY: stickerPlacement.scale}).setCoords();
        obj.sourcePath = sticker.image;
        c.add(obj).renderAll();

        c.setActiveObject(c.item(c.getObjects().length-1));

        c.renderAll();

        return obj;
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
      removeAll(saveAfter = false){
          this.withoutSaving((resumeSaving)=>{
            let c = this.canvas;
            let stickers = c.getObjects();
            stickers.forEach((sticker)=>{
              c.remove(sticker);
            });
            c.renderAll();
            resumeSaving();
          }, saveAfter);


      },
      selectionSet(){
        this.selection = true;
      },
      selectionCleared(){
        this.selection = false;
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

        const universalControl = ()=>{
          return e.getModifierState('Meta') || e.getModifierState('Control');
        }

        if(e.key === 'Delete' || e.key === 'Backspace'){
          this.removeItem();
        }
        if(e.key === 'a' && (universalControl())){
          this.selectAll();
        }


        if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.key) > -1){
          let step = 5;
          if(e.getModifierState('Shift')){
            step = 1;
          }
          this.moveSelection(e.key.toLowerCase().replace('arrow',''), step);
        }



        if((e.key === 'y' || ((e).key.toLowerCase() === 'z' && e.getModifierState('Shift'))) && universalControl()){
          this.redo();
        }
        else if(e.key === 'z' && universalControl()){
          this.undo();
        }

      },
      setZoom(opt){
        if(this.image){
          const delta = opt.e.deltaY;
          let zoom = this.zoomFactor;
          zoom = zoom + delta/200;
          if (zoom > this.maxZoomFactor) zoom = this.maxZoomFactor;
          if (zoom < this.minZoomFactor) zoom = this.minZoomFactor;
          this.zoomFactor = zoom;
          opt.e.preventDefault();
          opt.e.stopPropagation();
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
      'object:modified':this.saveState,
      'object:added':this.saveState,
      'object:removed':this.saveState,
      'mouse:wheel':this.setZoom,

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
    #finalImageContainer{
      position:absolute;
      top:0;
      left:0;
      right:0;
      bottom:0;
      background-color:black;
    }

    #finalImageContainer img{
      max-width:100%;
      max-height:100%;

    }
    #close{
      position:absolute;
      top:5px;
      right:5px;
    }

    #noImage{
      position:absolute;
      top:33%;
      left:0;
      right:0;
      padding:0 10%;
      font-size:2em;
      text-align:center;
      -webkit-user-select: none;  /* Chrome all / Safari all */
      -moz-user-select: none;     /* Firefox all */
      -ms-user-select: none;      /* IE 10+ */
      user-select: none;          /* Likely future */
    }

  </style>
