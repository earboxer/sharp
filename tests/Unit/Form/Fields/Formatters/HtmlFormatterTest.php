<?php

namespace Code16\Sharp\Tests\Unit\Form\Fields\Formatters;

use Code16\Sharp\Form\Fields\Formatters\HtmlFormatter;
use Code16\Sharp\Form\Fields\SharpFormHtmlField;
use Code16\Sharp\Tests\SharpTestCase;

class HtmlFormatterTest extends SharpTestCase
{

    /** @test */
    function we_can_format_value_to_front()
    {
        $value = str_random();

        $this->assertEquals($value, (new HtmlFormatter())->toFront(SharpFormHtmlField::make("html"), $value));
    }

    /** @test */
    function we_can_format_value_from_front()
    {
        $this->assertNull(
            (new HtmlFormatter())->fromFront(SharpFormHtmlField::make("html"), "attribute", str_random())
        );
    }
}