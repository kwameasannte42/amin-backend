"use strict";

var _supabaseJs = require("@supabase/supabase-js");

var supabaseUrl = process.env.SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
var supabase = (0, _supabaseJs.createClient)(supabaseUrl, supabaseKey);
module.exports = supabase;