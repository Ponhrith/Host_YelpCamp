const Campground=require('../models/campground');
const mbxGeocoding=require('@mapbox/mapbox-sdk/services/geocoding');
const mapBoxToken=process.env.MAPBOX_TOKEN;
const geocoder=mbxGeocoding({ accessToken: mapBoxToken });
const {cloudinary}=require('../cloudinary');
const moment = require('moment');

module.exports.index=async(req,res)=>{
        const campgrounds=await Campground.find({});
        res.render('campgrounds/index',{campgrounds});
    }

module.exports.renderNewForm=(req,res)=>{
        res.render('campgrounds/new');
    }

module.exports.createCampground=async (req,res,next)=>{
    // if(!req.body.campground) throw new ExpressError('campground data Invalid',400); //form is validated but still someone can send request (ex- using postman) then its shoul chek if campground object not present then should not save in database insted throw error whih will got to error handler throug next using catchAsync which we have defined 

    //instead of writing joi schema and validating here I will define middleware (validateCampgroud) which is passed as an argument  before this funtions runs

    const geoData= await geocoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
      }).send()

    const campground=new Campground(req.body.campground);
    campground.geometry=geoData.body.features[0].geometry;
    campground.images=req.files.map(f=>({url:f.path, filename:f.filename}));  //it will make an array which will contain objects(in which we have url and filename of image)
    campground.author=req.user._id;

    //--------------------------------
    campground.createdAt = new Date();


    //--------------------------------


    // console.log(campground);
    await campground.save();
    req.flash('Success','Successfully Made A New Campground!');
    res.redirect(`/campgrounds/${campground._id}`);
}

module.exports.showCampground=async(req,res)=>{
    const campground=await Campground.findById(req.params.id).populate({
        path:'reviews',  //populating reviews of this campground
        populate:{
            path:'author'  //nested population for author of reviews
        }
    }).populate('author');  //populating author of this campground
    //console.log(campground);
    if(!campground){
        req.flash('Error',"Can't Find that Campground");
        return res.redirect('/campgrounds');
    }
    //console.log(campground)

    //--------------------------------
    res.render('campgrounds/show',{campground, currentDate: new Date(), moment });

    //--------------------------------
}

module.exports.renderEditForm=async(req,res)=>{
    const campground=await Campground.findById(req.params.id);
    if(!campground){
        req.flash('Error',"Can't Find that Campground");
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/edit',{campground});
}

// module.exports.updateCampground=async(req,res,next)=>{
//     const {id}=req.params;
//     // console.log(req.body);
//     const campground=await Campground.findByIdAndUpdate(id,req.body.campground,{runValidators:true,new:true});
//     const imgs=req.files.map(f=>({url:f.path, filename:f.filename}));
//     campground.images.push(...imgs); //push on existing images
//     await campground.save();
//     if(req.body.deleteImages){
//         for(let filename of req.body.deleteImages){
//             await cloudinary.uploader.destroy(filename);
//         }
//         await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } });
//         // console.log(campground);
//     }
//     req.flash('success','successfully updated a campground!');
//     //res.send(req.body.campground);
//     res.redirect(`/campgrounds/${campground._id}`);
// }

module.exports.updateCampground = async (req, res, next) => {
    const { id } = req.params;
    const campground = await Campground.findById(id);
  
    if (!campground) {
      req.flash('Error', "Can't find that campground");
      return res.redirect('/campgrounds');
    }
  
    // Update the campground properties
    campground.title = req.body.campground.title;
    campground.location = req.body.campground.location;
    campground.description = req.body.campground.description;
    campground.price = req.body.campground.price;
  
    // Geocode the new location
    const geoData = await geocoder
      .forwardGeocode({
        query: req.body.campground.location,
        limit: 1
      })
      .send();
  
    campground.geometry = geoData.body.features[0].geometry;
  
    // Update the images
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.images.push(...imgs);
  
    await campground.save();
  
    // Handle deleted images
    if (req.body.deleteImages) {
      for (let filename of req.body.deleteImages) {
        await cloudinary.uploader.destroy(filename);
      }
      await campground.updateOne({
        $pull: { images: { filename: { $in: req.body.deleteImages } } }
      });
    }
  
    req.flash('Success', 'Successfully Updated a Campground!');
    res.redirect(`/campgrounds/${campground._id}`);
  };
  

module.exports.deleteCampground=async(req,res)=>{
    const {id}=req.params;
    const campground=await Campground.findByIdAndDelete(id);
    req.flash('Success','Successfully Deleted a Campground');
    res.redirect('/campgrounds');
}