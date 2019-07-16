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
        <button @click="showStickers = !showStickers" :disabled="!image" id="stickerButton" class="btn btn-info">
         <i class="fa fa-smile-o" aria-hidden="true"></i> Stickers
        </button>
        <button class="btn btn-secondary" :disabled="!image || detectingFaces" @click="autoCover">{{detectingFaces ? "Detecting faces..." : "Auto cover faces"}}</button>
        <button class="btn btn-danger" :disabled="!selection" @click.prevent="removeItem"><i class="fa fa-trash" aria-hidden="true"></i> Remove selected stickers
        </button>
        <button class="btn btn-warning" @click="confirmBefore(removeAll, 'Are you sure? This cannot be undone')" :disabled="stickerCount == 0"><i class="fa fa-refresh" aria-hidden="true"></i> Remove all stickers</button>




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
        image: null,
        detectingFaces: false

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
              this.setBackgroundImage();
            }
            img.src = event.target.result;
          };
          reader.readAsDataURL(files[0]);


      },

      clearControls(){
        this.showStickers = false;
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

      autoCover(){

        this.detectingFaces = true;
        this.detectFaces().then((detections)=>{

          let stickers = this.getStickerChoices();
          detections.forEach((detection)=>{
            const box = detection.box;

            const sticker = stickers.pop();

            const c = this.canvas;

            const centerX = c.width/2;
            const centerY = c.height/2;

            const faceScale = 1;

            const imgLeft = centerX - (this.imageWidth/2);
            const imgTop = centerY - (this.imageHeight/2);

            const width = this.scale * box.width;
            const height = this.scale * box.height;
            const left = (this.scale * box.x) + (imgLeft);
            const top = (this.scale * box.y) + (imgTop);

            const paddedWidth = width * faceScale;
            const paddedHeight = height * faceScale;
            const paddedLeft = left - ((paddedWidth - width)/2);
            const paddedTop = top - ((paddedHeight - height)/2);

            // const left = imgLeft;
            // const top = imgTop;

            this.addSticker(sticker, {height: paddedHeight, width: paddedWidth, left: paddedLeft, top: paddedTop});
            if(stickers.length === 0){
              stickers = this.getStickerChoices();
            }

          })

          this.detectingFaces = false;

        }, function(e){
          console.log(e);
          this.detectingFaces = false;
        });

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

      removeItem(){
        let c = this.canvas;
        c.getActiveObjects().forEach((o)=>{
          c.remove(o);
        })
        c.discardActiveObject();


      },
      saveImage(){
        let c = this.canvas;
        let image = c.toDataURL({
          format: 'jpeg',
          quality: 0.8,
          multiplier: 1/this.scale,
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
      addSticker(sticker, settings = {}){

        let c = this.canvas;

        const defaultOptions = {
          left: c.width/2,
          top: c.height/2,
          width: 50,
          height: 50
        }


        settings = Object.assign(defaultOptions, settings);

        fabric.loadSVGFromURL(sticker.image, function(objects, options){
         let obj = fabric.util.groupSVGElements(objects, options);
         // if(settings.width>settings.height){
          //   obj.scaleToHeight(settings.height).set({left: settings.left, top: settings.top}).setCoords();
          // }
          // else{
          //   obj.scaleToWidth(settings.width).set({left: settings.left, top: settings.top}).setCoords();
          // }


          const stickerPlacement = sticker.scaleToCoverFace(settings.left, settings.top, settings.width, settings.height);
          obj.set({left: stickerPlacement.left, top: stickerPlacement.top, scaleX: stickerPlacement.scale, scaleY: stickerPlacement.scale}).setCoords();


         c.add(obj).renderAll();

        c.setActiveObject(c.item(c.getObjects().length-1));

        c.renderAll();


        })
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

        this.setBackgroundImage();
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
