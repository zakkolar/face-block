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
        <button class="btn btn-danger" :disabled="!selection" @click="removeItem"><i class="fa fa-trash" aria-hidden="true"></i> Remove selected stickers
        </button>
        <button class="btn btn-warning" @click="confirmBefore(removeAll, 'Are you sure? This cannot be undone')" :disabled="stickerCount == 0"><i class="fa fa-refresh" aria-hidden="true"></i> Remove all stickers</button>



      </div>
      <div id="stickerList" v-show="showStickers">
        <img @click="addSticker(sticker)" v-for="sticker in stickers" :src="sticker">
      </div>
      <div id="finalImageContainer" v-if="finalImage">
        <img :src="finalImage">
        <button id="close" @click="closeFinalImage" class="btn btn-danger">x</button>
      </div>
    </div>
  </template>

  <script>
    import {fabric} from 'fabric-with-gestures';
    import {saver} from 'file-saver/FileSaver';
    const resetSizeEvents = ['resize','orientationchange'];
  export default {
    name: 'Blocker',
    data () {
      return {
        msg: 'Welcome to Your Vue.js App',
        canvas:null,
        stickers: [
          require('../assets/stickers/penguin_birthday.svg'),
          require('../assets/stickers/penguin_bowtie.svg'),
          require('../assets/stickers/penguin_crown.svg'),
          require('../assets/stickers/penguin_fancy.svg'),
          require('../assets/stickers/penguin_hat.svg'),
          require('../assets/stickers/penguin_winter.svg')
        ],
        selection: false,
        showStickers: false,
        finalImage:null,
        scale:1,
        imageWidth:1,
        imageHeight:1,
        image: null

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
      },

      updateCanvasImage(e){
          let files = e.target.files;

          let reader = new FileReader();

          reader.onload = (e) => {
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

      removeItem(e){
        e.preventDefault();
        let c = this.canvas;
        c.getActiveObjects().forEach((o)=>{
          c.remove(o);
        })
        c.discardActiveObject();


      },
      saveImage(){
        let c = this.canvas;
        this.finalImage = c.toDataURL({
          format: 'jpeg',
          quality: 0.8,
          multiplier: 1/this.scale,
          width: this.imageWidth,
          height: this.imageHeight,
          left: (c.width - this.imageWidth)/2,
          top: (c.height - this.imageHeight)/2
        })
        // c.getElement().toBlob((blob)=>{
        //   var urlCreator = window.URL || window.webkitURL;
        //   this.finalImage = urlCreator.createObjectURL(blob);
        //
        // })
      },
      closeFinalImage(){
        this.finalImage = null
      },
      addSticker(sticker){
        let c = this.canvas;
        fabric.loadSVGFromURL(sticker, function(objects, options){
         let obj = fabric.util.groupSVGElements(objects, options);
         obj.scaleToWidth(50).set({left: c.width/2, top: c.height/2}).setCoords();

         c.add(obj).renderAll();

        c.setActiveObject(c.item(c.getObjects().length-1));

        c.renderAll();


        })
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
      resetSizeEvents.forEach((e)=>{
        window.addEventListener(e,this.resetSize);
      });

    },
    destroyed(){
      resetSizeEvents.forEach((e)=>{
        window.removeEventListener(e,this.resetSize);
      });
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
    }

  </style>
