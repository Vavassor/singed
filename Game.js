// Global Variables............................................................

var menu_text = [
	"HELP",
	"SAVE",
	"RESTORE"
];

var canvas_width = 640;
var canvas_height = 480;
var context = null;
var focused = false;

var start_time = null;
var cursor_flicker_time = 0;

var image_cloak_skeleton = null;
var image_focus_indicator = null;

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
	this.max_characters = 60;
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
	if (character && character.search(/[a-z0-9 .?!:;'"]/i) >= 0) {
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

function draw_frame() {
	// entire canvas is cleared every frame
	context.clearRect(0, 0, canvas_width, canvas_height);
	
	// Draw screen background
	{
		context.drawImage(image_cloak_skeleton, 0, 16, 726, 426);
	}
	
	// Draw main menu at top of canvas
	{
		var menu_x = 0;
		var menu_y = 0;
		var menu_width = canvas_width;
		var menu_height = 16;
	
		context.fillStyle = "rgb(191, 191, 191)";
		context.fillRect(menu_x, menu_y, menu_width, menu_height);
		
		var text_y = menu_y + menu_height - 2;
		
		context.fillStyle = "rgb(0, 0, 0)";
		context.fillText("Hello and Welcome! —", menu_x, text_y);
		
		var button_spacing = 9;
		var button_x = 190;
		for (var i = 0, n = menu_text.length; i < n; ++i) {
			var text = menu_text[i];
			context.fillText(text, menu_x + button_x, text_y);
			button_x += (text.length + 1) * button_spacing;
		}
		
		// draw indicator to show when the canvas has focus
		{
			var indicator_width = 9;
			var margin = 3;
			var clip_x = focused ? 9 : 0;
			context.drawImage(
				image_focus_indicator,
				clip_x,
				0,
				indicator_width,
				indicator_width,
				menu_x + menu_width - indicator_width - margin,
				menu_y + margin,
				indicator_width,
				indicator_width);
		}
	}
	
	// Draw Command Box at bottom of canvas
	{
		var command_box_x = 16;
		var command_box_y = canvas_height - 16;
		
		// since a monospaced (fixed-width) font is used,
		// the glyph dimensions should be constant
		var glyph_width = 8.8;
		var glyph_height = 16;
		
		// draw command text
		{
			var command_text = user_command.text.join("");
			
			context.font = "16px monospace";
			context.fillStyle = "rgb(255, 255, 255)";
			context.fillText(">", command_box_x - glyph_width, command_box_y);
			context.fillText(command_text, command_box_x, command_box_y);
		}
		
		// The cursor flickers on and off on a timer;
		// So, check if it should be flickered on before drawing it.
		var one_second = 1000;
		if (cursor_flicker_time % one_second < one_second / 2) {
			var x = command_box_x + glyph_width * user_command.cursor;
			var y = command_box_y - glyph_height;
			context.fillRect(x, y, glyph_width, glyph_height);
		}
	}
}

// Focus Handlers..............................................................

function focusin_handler(event) {
	focused = true;
}

function focusout_handler(event) {
	focused = false;
}

// Game Functions..............................................................

function game_loop(timestamp) {
	var delta_time = timestamp - start_time;
	start_time = timestamp;
	
	// Update game state
	{
		cursor_flicker_time += delta_time;
	}
	
	draw_frame();
	
	window.requestAnimationFrame(game_loop);
}

function load_image(filename) {
	var image = new Image();
	image.src = filename;
	return image;
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
		
		window.requestAnimationFrame(game_loop);
	}
	
	image_cloak_skeleton = load_image("Cloak-Skeleton.png");
	image_focus_indicator = load_image("Focus-Indicator.png");
	
	canvas.addEventListener("keypress", keypress_handler);
	canvas.addEventListener("keydown", keydown_handler);
	
	canvas.addEventListener("focusin", focusin_handler);
	canvas.addEventListener("focusout", focusout_handler);
}