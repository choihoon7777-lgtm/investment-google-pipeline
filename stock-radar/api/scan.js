import { scanMarket } from "../src/scan.js";
export default async function handler(req,res){
  try{
    const result=await scanMarket({allowOutside:req.query?.force==="1"});
    res.status(200).json({ok:true,...result});
  }catch(error){
    console.error(error);
    res.status(500).json({ok:false,error:String(error?.message||error),generatedAt:new Date().toISOString()});
  }
}
