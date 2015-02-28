// Global Variables............................................................

var menu_text = [
	"HELP",
	"SAVE",
	"RESTORE"
];

var scale = 3;
var screen_width = 320;
var screen_height = 200;
var context = null;
var focused = false;

var last_frame_time = null;
var game_time = 0;

var image_background = null;
var image_sprite_sheet = null;

var audio_music = null;

var font_white = null;

// User Command Line...........................................................

function clamp(value, minimum, maximum) {
	if (value < minimum)
		return minimum;
	else if (value > maximum)
		return maximum;
	return value;
}

function CommandLine() {
	this.text = [];
	this.max_characters = 52;
	this.cursor = 0;
	
	this.set_cursor = function(index) {
		var clamped = clamp(index, 0, this.max_characters - 1);
		this.cursor = Math.floor(clamped);
	}
	
	this.shift_cursor = function(offset) {
		var position = this.cursor + offset;
		this.set_cursor(position);
	};
	
	this.insert_character = function(character) {
		// shift all characters above the cursor position one index right
		var start = this.cursor;
		var end = this.max_characters - 1;
		for (var i = end; i > start; --i) {
			this.text[i] = this.text[i - 1];
		}

		this.text[this.cursor] = character;
		this.shift_cursor(1);
	};
	
	this.backspace = function() {
		this.shift_cursor(-1);
		this.delete_character();
	}
	
	this.delete_character = function() {
		// shift all characters above the cursor position one index left
		// and overwrite the character to remove
		var end = this.max_characters - 1;
		for (var i = this.cursor; i < end; ++i) {
			this.text[i] = this.text[i + 1];
		}
		this.text[end] = " ";
	}
	
	this.clear_line = function() {
		for (var i = 0, n = this.text.length; i < n; ++i) {
			this.text[i] = " ";
		}
		this.set_cursor(0);
	}
}

var user_command = new CommandLine();

// Input Handlers..............................................................

function get_keypress_character(event) {
	if (event.which == null) {
		return String.fromCharCode(event.keyCode); // IE
	} else if (event.which != 0 && event.charCode != 0) {
		return String.fromCharCode(event.which);
	} else {
		return null;
	}
}

function keypress_handler(event) {
	var character = get_keypress_character(event);
	if (character && character.search(/[a-z0-9 .,?!:;'"]/i) >= 0) {
		user_command.insert_character(character);
	}
}

function keydown_handler(event) {
	switch (event.keyCode) {
		case 8: { // Backspace
			user_command.backspace();
			// Chrome uses backspace as a hotkey for the browser's Back button
			// and having the page unload when the user is trying to type a
			// command is no good, so cancel the key event before that happens
			event.preventDefault();
		} break;
			
		case 13: // Enter
			// process_command(user_command.text);
			user_command.clear_line();
			break;
		case 35: // End
			user_command.set_cursor(user_command.max_characters - 1);
			break;
		case 36: // Home
			user_command.set_cursor(0);
			break;
		case 37: // Left Arrow
			user_command.shift_cursor(-1);
			break;
		case 39: // Right Arrow
			user_command.shift_cursor(1);
			break;
		case 46: // Delete
			user_command.delete_character();
			break;
	}
}

// Drawing Functions...........................................................

// class for a bitmap/pixel font: the font is represented by an image
// containing all the symbols needed for drawing strings.
function Font(image, glyph_width, glyph_height) {
	this.table = "0123456789/()&!?ABCDEFGHIJKLMNOPQRSTUVWXYZ.,;:'\"abcdefghijklmnopqrstuvwxyz~—<> ";
	this.table_columns = 16;
	this.image = image;
	this.glyph_width = glyph_width;
	this.glyph_height = glyph_height;
	this.spacing = 0;
	
	this.lookup_character_index = function(character) {
		for (var i = 0, n = this.table.length; i < n; ++i) {
			if (character == this.table.charAt(i)) {
				return i;
			}
		}
		return -1;
	}
}

// This loops through each character in the text string and looks up
// the corresponding symbol in the font image. It draws to the context
// according to the position offsets given (x and y) while accounting 
// for the spacing and dimensions for the font
function draw_text(context, text, font, x, y) {
	var glyph_width = font.glyph_width;
	var glyph_height = font.glyph_height;
	var spacing = font.spacing;
	var num_columns = font.table_columns;
	
	for (var i = 0, n = text.length; i < n; ++i) {
		var character = text.charAt(i);
		var index = font.lookup_character_index(character);
		if (index >= 0) {
			var column = Math.floor(index % num_columns);
			var row = Math.floor(index / num_columns);
			var sheet_x = column * glyph_width;
			var sheet_y = row * glyph_height;
			var draw_spacing = glyph_width + spacing;
			
			context.drawImage(
				font.image,
				sheet_x,
				sheet_y,
				glyph_width,
				glyph_height,
				x + draw_spacing * i,
				y,
				glyph_width,
				glyph_height);
		}
	}
}

function Sprite() {
	this.x = 0;
	this.y = 0;
	this.width = 0;
	this.height = 0;
	this.sheet_x = 0;
	this.sheet_y = 0;
}

var sprites = [];

function rgb_to_style(red, green, blue) {
	return "rgb(" + red + ", " + green + ", " + blue + ")";
}

function draw_main_menu() {
	var x = 0;
	var y = 0;
	var width = screen_width;
	var height = 8;

	// background colour for the menu bar
	{
		context.fillStyle = rgb_to_style(191, 191, 191);
		context.fillRect(x, y, width, height);
	}
	
	var text_y = y - 1;
	
	// bar title text
	draw_text(context, "Esc Menu — ", font_white, x, text_y);
	
	// the text for each menu button
	var button_spacing = 8;
	var button_x = 96;
	for (var i = 0, n = menu_text.length; i < n; ++i) {
		var text = menu_text[i];
		draw_text(context, text, font_white, x + button_x, text_y);
		button_x += (text.length + 1) * button_spacing;
	}
}

function draw_command_box() {
	var width = screen_width;
	var height = 16;
	var x = 0;
	var y = screen_height - height;
	
	// the background color of the box itself
	{
		context.fillStyle = rgb_to_style(0, 0, 0);
		context.fillRect(x, y, width, height);
	}
	
	// draw the text being entered by the user
	{
		var command_text = user_command.text.join("");
		draw_text(context, ">" + command_text, font_white, x, y);
	}
	
	// The cursor flickers on and off over time;
	// So, check if it should be flickered on before drawing it.
	var one_second = 1000;
	if (game_time % one_second < one_second / 2) {
		var glyph_width = font_white.glyph_width;
		var glyph_height = font_white.glyph_height;
		var cursor_x = x + glyph_width * user_command.cursor + glyph_width;
		var cursor_y = y;
		
		context.fillStyle = rgb_to_style(255, 255, 255);
		context.fillRect(cursor_x, cursor_y, glyph_width, glyph_height);
	}
}

function draw_focus_alert() {
	var height = 24;
	var width = 144;
	var x = screen_width / 2 - width / 2;
	var y = screen_height / 2 - height / 2;
	
	// draw background for the text box
	{
		context.fillStyle = rgb_to_style(191, 191, 191);
		context.fillRect(x, y, width, height);
	}
	
	var top_margin = 2;
	var left_margin = 4;
	var text_x = x + left_margin;
	var text_y = y + top_margin;

	draw_text(context, "Click here or use", font_white, text_x, text_y);
	draw_text(context, "Tab key to focus!", font_white, text_x, text_y + font_white.glyph_height);
}

function draw_frame() {
	// entire canvas is cleared every frame
	context.clearRect(0, 0, screen_width, screen_height);
	
	// Draw screen background
	context.drawImage(image_background, 0, 0, screen_width, screen_height);
	
	for (var i = 0, n = sprites.length; i < n; ++i) {
		var sprite = sprites[i];
		context.drawImage(
			image_sprite_sheet,
			sprite.sheet_x,
			sprite.sheet_y,
			sprite.width,
			sprite.height,
			Math.floor(sprite.x),
			Math.floor(sprite.y),
			sprite.width,
			sprite.height);
	}
	
	draw_main_menu();
	draw_command_box();
	
	// draw text box in front of everything else to alert the user
	// when the canvas doesn't have focus
	if (!focused) {
		draw_focus_alert();
	}
}

// Focus Handlers..............................................................

function focusin_handler(event) {
	focused = true;
	audio_music.play();
}

function focusout_handler(event) {
	focused = false;
	audio_music.pause();
}

// Game Functions..............................................................

function game_loop(timestamp) {
	var delta_time = timestamp - last_frame_time;
	last_frame_time = timestamp;

	// Update game state
	if (focused) {
		game_time += delta_time;
	}
	
	draw_frame();
	
	window.requestAnimationFrame(game_loop);
}

function load_image(filename) {
	var image = new Image();
	image.src = filename;
	return image;
}

function load_audio(filename) {
	var audio = new Audio();
	if (audio) {
		if (audio.canPlayType('audio/mpeg;') != "") {
			audio.src = filename + ".mp3";
		} else if (audio.canPlayType('audio/ogg; codecs="vorbis"') != "") {
			audio.src = filename + ".ogg";
		}
		audio.autoplay = false;
		audio.controls = false;
		audio.loop = true;
		audio.load();
	}
	return audio;
}

function run_game(canvas_ID) {
	var canvas = document.getElementById(canvas_ID);
	canvas_width = canvas.width;
	canvas_height = canvas.height;
	
	context = canvas.getContext('2d');
	if (context) {
		// use point/nearest-neighbor filtering when drawing images
		// so pixel sharpness is preserved for upscaling
		context.imageSmoothingEnabled = false;
		
		// upscale the context's transform which will affect
		// all drawing calls henceforth
		context.scale(scale, scale);
		
		window.requestAnimationFrame(game_loop);
	}
	
	// load test scene
	{
		image_background = load_image("Cloak-Skeleton.png");
		image_sprite_sheet = image_background;
		
		audio_music = load_audio("Fairy");
		audio_music.volume = 0.0;
		
		var image_font_white = load_image("Font.png");
		font_white = new Font(image_font_white, 6, 8);
		
		var sprite = new Sprite();
		sprite.x = 127;
		sprite.y = 163;
		sprite.width = 16;
		sprite.height = 16;
		sprite.sheet_x = 120;
		sprite.sheet_y = 126;
		sprites[0] = sprite;
	}
	
	canvas.addEventListener("keypress", keypress_handler);
	canvas.addEventListener("keydown", keydown_handler);
	
	canvas.addEventListener("focusin", focusin_handler);
	canvas.addEventListener("focusout", focusout_handler);
}