from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import StringField, PasswordField, TextAreaField, FloatField, SelectField, SubmitField
from wtforms.validators import DataRequired, Email, EqualTo, Length, NumberRange, ValidationError
from models.database import User

class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[
        DataRequired(), 
        Length(min=4, max=20)
    ])
    email = StringField('Email', validators=[
        DataRequired(), 
        Email()
    ])
    password = PasswordField('Password', validators=[
        DataRequired(), 
        Length(min=6)
    ])
    password2 = PasswordField('Repeat Password', validators=[
        DataRequired(), 
        EqualTo('password')
    ])
    seller_personality = SelectField('AI Seller Personality', choices=[
        ('flexible', 'Flexible - Willing to negotiate (Recommended)'),
        ('aggressive', 'Aggressive - Holds firm on prices'),
        ('quick_sale', 'Quick Sale - Motivated to sell fast'),
        ('premium', 'Premium - Focuses on quality and value')
    ], validators=[DataRequired()])
    buyer_personality = SelectField('AI Buyer Personality', choices=[
        ('fair', 'Fair - Balanced negotiator (Recommended)'),
        ('bargain_hunter', 'Bargain Hunter - Seeks best deals'),
        ('quick', 'Quick Buyer - Ready to buy fast'),
        ('premium', 'Premium - Values quality'),
        ('student', 'Student - Budget-conscious')
    ], validators=[DataRequired()])
    submit = SubmitField('Register')
    
    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('Username already taken. Please choose a different one.')
    
    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('Email already registered. Please choose a different one.')

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')

class ItemForm(FlaskForm):
    name = StringField('Item Name', validators=[
        DataRequired(), 
        Length(min=1, max=200)
    ])
    description = TextAreaField('Description', validators=[Length(max=1000)])
    furniture_type = SelectField('Furniture Type', choices=[
        ('couch', 'Couch'),
        ('dining_table', 'Dining Table'),
        ('bookshelf', 'Bookshelf'),
        ('chair', 'Chair'),
        ('dresser', 'Dresser'),
        ('other', 'Other')
    ], validators=[DataRequired()])
    starting_price = FloatField('Starting Price ($)', validators=[
        DataRequired(), 
        NumberRange(min=1, max=100000)
    ])
    min_price = FloatField('Minimum Price ($)', validators=[
        DataRequired(), 
        NumberRange(min=1, max=100000)
    ])
    condition = SelectField('Condition', choices=[
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor')
    ], validators=[DataRequired()])
    image = FileField('Item Image', validators=[
        FileAllowed(['jpg', 'jpeg', 'png'], 'Images only!')
    ])
    submit = SubmitField('Create Listing')
    
    def validate_min_price(self, min_price):
        if min_price.data >= self.starting_price.data:
            raise ValidationError('Minimum price must be less than starting price.')

class PersonalityForm(FlaskForm):
    seller_personality = SelectField('AI Seller Personality', choices=[
        ('flexible', 'Flexible - Willing to negotiate (Recommended)'),
        ('aggressive', 'Aggressive - Holds firm on prices'),
        ('quick_sale', 'Quick Sale - Motivated to sell fast'),
        ('premium', 'Premium - Focuses on quality and value')
    ], validators=[DataRequired()])
    buyer_personality = SelectField('AI Buyer Personality', choices=[
        ('fair', 'Fair - Balanced negotiator (Recommended)'),
        ('bargain_hunter', 'Bargain Hunter - Seeks best deals'),
        ('quick', 'Quick Buyer - Ready to buy fast'),
        ('premium', 'Premium - Values quality'),
        ('student', 'Student - Budget-conscious')
    ], validators=[DataRequired()])
    submit = SubmitField('Update Personality')